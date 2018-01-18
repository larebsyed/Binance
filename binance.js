(function() {
    main();
})();

function main() {
    'use strict';
    var $trades = $("*[ng-show*='lswt'] #tradeOrderBox .table tr");
    var trades = [];
    $trades.each(function() {
        var trade = row_to_array(this);
        trade = _.object(["date", "pair", "type", "side", "avg", "price", "filled", "amount", "total", "status", "row"], trade);
        // _.invoke(trade, function(item){
        //     item.date = Moment(item.date, 'HH:mm:ss')
        // });
        trades.push(trade);
    });
    var viewModel = {
        all_trades: [],
        all_balances: [],
        selected_pair: selected_pair(),
        balance: ko.observable(0),
        btc_balance: ko.observable(0),
        min_trade: ko.observable(0),
        upper_limit: ko.observable(0),
        lower_limit: ko.observable(0),
        max_trade: ko.observable(0),
        percentage1m: ko.observable(0),
        percentage2m: ko.observable(0),
        percentage3m: ko.observable(0),
        total_trades: ko.observable(0),
        duration: ko.observable(0),
        transaction_per_min: ko.observable(0),
        cost_amount : ko.observable(0),
        cost_usd : ko.observable(0),
        autoUpdatePrice : ko.observable(false),
        update: function() {
            viewModel.all_balances = get_balances();
            viewModel.duration(viewModel.duration() + 1);
            if (_.isUndefined(viewModel.all_trades[selected_pair()])) {
                viewModel.all_trades[selected_pair()] = [];
            }
            var new_trades = add_new_trades(viewModel.all_trades[selected_pair()]);
            if (new_trades.length > 0) {
                viewModel.all_trades[selected_pair()] = viewModel.all_trades[selected_pair()].concat(new_trades);
                var selected_trades = viewModel.all_trades[selected_pair()];
                var percentage1m = calculate_change(selected_trades, 1).toFixed(2);
                var percentage2m = calculate_change(selected_trades, 2).toFixed(2);
                var percentage3m = calculate_change(selected_trades, 3).toFixed(2);
                var user_stats = get_user_trading_stats(selected_pair());
                viewModel.cost_amount(user_stats.amount.toFixed(1));
                viewModel.cost_usd("$" + user_stats.usd.toFixed(5));
                viewModel.balance("$" + balance_to_usd().toFixed(5));
                viewModel.percentage1m(percentage1m + "%");
                viewModel.percentage2m(percentage2m + "%");
                viewModel.percentage3m(percentage3m + "%");
                var stats = get_trade_stats(selected_trades);
                viewModel.max_trade(stats.max_trade.toFixed(5));
                viewModel.min_trade(stats.min_trade.toFixed(5));
                viewModel.upper_limit(stats.upper_quartile.toFixed(5));
                viewModel.lower_limit(stats.lower_quartile.toFixed(5));
                viewModel.total_trades(selected_trades.length);
                times = _.pluck(selected_trades, "time");
                var duration = _.max(times).diff(_.min(times), 'seconds');
                viewModel.duration(duration);
                viewModel.transaction_per_min((selected_trades.length / duration).toFixed(5));
                if(viewModel.autoUpdatePrice())
                {
                    var latest_bid = parseFloat($("#bidScrollBox *[ng-click='trade(bid[0])']:first span:first").text());
                    0.00000001
                    $("#buyPrice").val(latest_bid+0.00000001);
                     var latest_bid = parseFloat($("#askScrollBox *[ng-click='trade(ask[0])']:last span:first").text());
                    0.00000001
                    $("#sellPrice").val(latest_bid-0.00000001);
                }
            }
        },
        reset: function() {
            this.all_trades[selected_pair()] = get_public_trades();
        }
    };
    create_html();
    viewModel.all_trades[selected_pair()] = get_public_trades();
    setInterval(function() {
        ko.tasks.schedule(viewModel.update);
    }, 1000);

    ko.applyBindings(viewModel, $("#stats")[0]);

    function create_html() {
        var table = emmet.make("table.table#stats>tbody>tr>th>button[data-bind=click:reset()]{reset}^+th{Max}+th{Min}");
        var rows = [];
        rows.push(emmet.make("tr>th{Price}+td[data-bind=text:max_trade]+td[data-bind=text:min_trade]"));
        rows.push(emmet.make("tr>th{Buy Limit}+td[data-bind=text:upper_limit]+td[data-bind=text:lower_limit]"));
        rows.push(emmet.make("tr>th{1 min % +/-}+td+td[data-bind=text:percentage1m]"));
        rows.push(emmet.make("tr>th{2 min % +/-}+td+td[data-bind=text:percentage2m]"));
        rows.push(emmet.make("tr>th{3 min % +/-}+td+td[data-bind=text:percentage3m]"));
        rows.push(emmet.make("tr>th{Total Trades}+td+td[data-bind=text:total_trades]"));
        rows.push(emmet.make("tr>th{T/S}+td+td[data-bind=text:transaction_per_min]"));
        rows.push(emmet.make("tr>th{Duration}+td+td[data-bind=text:duration]"));
        rows.push(emmet.make("tr>th{Current Balance}+td{}+td[data-bind=text:balance]"));
        rows.push(emmet.make("tr>th{Cost Amount/USD}+td[data-bind=text:cost_amount]+td[data-bind=text:cost_usd]"));
        rows.push(emmet.make("tr>th{Auto Update Best Buy}+input[type=checkbox][data-bind=checked:autoUpdatePrice]"));
        _.invoke(rows, function(){
            $(table).append($(this));
        });
        $("#tradeHistory .table:first").before(table);
    }

    function calculate_change(trades, min) {
        console.log("trades", trades);
        if (trades.length > 0) {
            var now = _.max(_.pluck(trades, "time"));
            var last_minute_trades = _.filter(trades, function(trade) {
                if (min * 60 >= now.diff(trade.time, "seconds"))
                    return true;
            });
            last_minute_trades = _.sortBy(last_minute_trades, function(trade) {
                return trade.time;
            });
            var prices = _.pluck(last_minute_trades, "price");

            var last_price = parseFloat(prices[0]);
            var current_price = parseFloat(prices[prices.length - 1]);
            return ((current_price - last_price) / last_price) * 100;
        }
        return 0;
    }

    function get_trade_stats(public_trades) {
        var prices = _.map(public_trades, function(trade) {
            return parseFloat(trade.price.replace(',', ''));
        });
        var stats = {
            min_trade: nj.min(prices),
            mean_trade: nj.mean(prices),
            max_trade: nj.max(prices),
            upper_quartile: nj.mean(prices) + nj.std(prices),
            lower_quartile: nj.mean(prices) - nj.std(prices),
            spread: nj.max(prices) - nj.min(prices)
        };
        return stats;
    }

    function get_user_trading_stats(selected_pair) {
        var user_trades = get_user_trades(selected_pair);
        var balance = current_balance();
        var usd_balance = balance_to_usd();
        var btc_balance = balance_to_btc();
        var usd_to_btc = usd_balance / btc_balance;
        var trade_btc = 0;
        var trade_balance = 0;
        for (var trade of _(user_trades).where({"status":"Filled"}))
        {
            if(trade_balance < balance)
            {
                if(trade.side == "Sell")
                {
                    if(trade.amount > trade_balance){
                        trade_balance -= parseFloat(trade.amount);
                        trade_btc -= parseFloat(trade.total);
                    }
                }
                if(trade.side == "Buy")
                {
                    if(parseFloat(trade.amount)+trade_balance>balance)
                    {
                        var difference = balance - trade_balance;
                        trade_btc += difference * parseFloat(trade.price);
                        trade_balance = balance;
                    }
                    else{
                        trade_balance += parseFloat(trade.amount);
                        trade_btc += parseFloat(trade.total);
                    }
                }

            }
        }

        var base_currency = selected_pair.split("/")[1];
        var holding={
            "current_amount": balance,
            "current_usd" : usd_balance,
            "current_btc" : btc_balance,
            "amount" : trade_balance,
            "btc" : (base_currency == "USDT") ? trade_btc/usd_to_btc :  trade_btc,
            "usd" : (base_currency == "USDT") ? trade_btc :  trade_btc*usd_to_btc
        };
        return holding;
    }
    function get_user_trades(pair){
        var $trades = $("*[ng-show*='lswt'] #tradeOrderBox .table tr");
        var trades = [];
        $trades.each(function() {
        var trade = row_to_array(this);
        trade = _.object(["date", "pair", "type", "side", "avg", "price", "filled", "amount", "total", "status", "row"], trade);
        trades.push(trade);
        });
        return _(trades).where({"pair": pair});
    }
    function get_public_trades() {
        var loading = $("#tradeHistory #divLoading").filter(function() {
            return $(this).css("display") != 'none';
        });
        if (loading.length > 0)
            return [];
        var public_trades = [];
        var $public_trades = $("#tradeHistory .newtrade tr");
        $public_trades.each(function() {
            var trade = row_to_array(this);
            trade = _.object(["price", "amount", "time", "row"], trade);
            trade.time = moment(trade.time, 'HH:mm:ss');
            public_trades.push(trade);
        });
        return public_trades;
    }

    function get_balances() {
        var $balances = $(".zjcc_table tr");
        var balances = [];
        $balances.each(function() {
            var balance = row_to_array(this);
            balance = _.object(["coin", "total_balance", "available_balance", "inorder", "btc", "row"], balance);
            balances.push(balance);
        });
        return balances;
    }

    function get_currency() {
        var currency = selected_pair().split('/')[0];
        return currency;
    }
    function selected_pair() {
        return $(".selectsym[ng-class*='isOpened'] span:first").text();
    }

    function balance_to_usd() {
        var currency = get_currency();
        var usd_rate = $(".transMoney").text();
        usd_rate = usd_rate.replace("$", "");
        usd_rate = usd_rate.replace(",", "");
        usd_rate = usd_rate.replace(currency, '');
        usd_rate = parseFloat(usd_rate);
        var balance = current_balance();
        return balance * usd_rate;
    }
    function balance_to_btc() {
        var balance = current_balance();
        if(selected_pair().split('/')[0] == 'BTC')
            return balance;
        var currency = get_currency();
        var btc_rate = $(".table.depthbg .ng-binding:first").text();
        btc_rate = parseFloat(btc_rate);
        return balance * btc_rate;
    }
    function current_balance() {
         var currency = get_currency();
         var balance = $(".orderform div:not(.ng-hide) .f-fr .bid-div .f-fr").text();
         balance = parseFloat(balance.replace(currency, '').replace(' ', ''));
         return balance;
    }

    function add_new_trades(all_trades) {
        var new_trades = get_public_trades();
        var times = _.pluck(all_trades, "time");
        var max_time = _.max(times);
        new_trades = _.filter(new_trades, function(trade) {
            if (max_time < trade.time)
                return true;
        });
        return new_trades;
    }

    function row_to_array(row) {
        var $trade = $(row).find(".ng-binding");
        var trade = [];
        $trade.each(function() {
            trade.push($(this).html());
        });
        trade.push(row);
        return trade;
    }

}
(function() {
  main();
})();
function main() {
    'use strict';
    var $trades = $("*[ng-show*='lswt'] #tradeOrderBox .table tr");
    var trades = [];
    $trades.each(function()
    {
        var trade = row_to_array(this);
        trade = _.object(["date","pair","type","side","avg","price","filled","amount","total","status","row"], trade);
        // _.invoke(trade, function(item){
        //     item.date = Moment(item.date, 'HH:mm:ss')
        // });
        trades.push(trade);
    });
    var viewModel = {
        all_trades: [],
        selected_pair: selected_pair(),
        balance: ko.observable(0),
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
        update : function(){
            this.duration(this.duration()+1);
            if(_.isUndefined(this.all_trades[selected_pair()])){
                this.all_trades[selected_pair()] = [];
            }
            var new_trades = add_new_trades(this.all_trades[selected_pair()]);
            if(new_trades.length>0){
            this.all_trades[selected_pair()] = this.all_trades[selected_pair()].concat(new_trades);
            var selected_trades = this.all_trades[selected_pair()]
            var percentage1m = calculate_change(selected_trades,1).toFixed(2);
            var percentage2m = calculate_change(selected_trades,2).toFixed(2);
            var percentage3m = calculate_change(selected_trades,3).toFixed(2);
            this.balance("$"+balance_to_usd().toFixed(5));
            this.percentage1m(percentage1m+"%");
            this.percentage2m(percentage2m+"%");
            this.percentage3m(percentage3m+"%");
            var stats = get_trade_stats(selected_trades);
            this.max_trade(stats.max_trade.toFixed(8));
            this.min_trade(stats.min_trade.toFixed(8));
            this.upper_limit(stats.upper_quartile.toFixed(8));
            this.lower_limit(stats.lower_quartile.toFixed(8));
            this.total_trades(selected_trades.length);
            times = _.pluck(selected_trades, "time");
            var duration = _.max(times).diff(_.min(times), 'seconds');
            this.duration(duration);
            this.transaction_per_min((selected_trades.length/duration).toFixed(5));
        }
        },
        reset: function(){
            this.all_trades[selected_pair()]=get_public_trades();
        }
    };
    viewModel.all_trades[selected_pair()] = get_public_trades();
    setInterval(function() {
        viewModel.update();
    }, 1000);
   
    create_html();
    ko.applyBindings(viewModel, $("#stats")[0]);

    function create_html(){
        var table = emmet.make("table.table#stats>tbody>tr>th>button[data-bind=click:reset()]{reset}^+th{Max}+th{Min}");
        var row = emmet.make("tr>th{Price}+td[data-bind=text:max_trade]+td[data-bind=text:min_trade]");
        var row1 = emmet.make("tr>th{Buy Limit}+td[data-bind=text:upper_limit]+td[data-bind=text:lower_limit]");
        var row2 = emmet.make("tr>th{1 min % +/-}+td+td[data-bind=text:percentage1m]");
        var row3 = emmet.make("tr>th{2 min % +/-}+td+td[data-bind=text:percentage2m]");
        var row4 = emmet.make("tr>th{3 min % +/-}+td+td[data-bind=text:percentage3m]");
        var row5 = emmet.make("tr>th{Total Trades}+td+td[data-bind=text:total_trades]");
        var row6 = emmet.make("tr>th{T/S}+td+td[data-bind=text:transaction_per_min]");
        var row7 = emmet.make("tr>th{Duration}+td+td[data-bind=text:duration]");
        var row8 = emmet.make("tr>th{Balance}+td+td[data-bind=text:balance]");
        $(table).append($(row));
        $(table).append($(row1));
        $(table).append($(row2));
        $(table).append($(row3));
        $(table).append($(row4));
        $(table).append($(row5));
        $(table).append($(row6));
        $(table).append($(row7));
        $(table).append($(row8));
        $("#tradeHistory .table:first").before(table);
    }
    function calculate_change(trades, min){
        console.log("trades",trades);
        if(trades.length>0){
            var now = _.max(_.pluck(trades, "time"));
            var last_minute_trades =_.filter(trades, function(trade){
                                                        if(min*60 >= now.diff(trade.time,"seconds"))
                                                            return true;                
                                                    });
            last_minute_trades = _.sortBy(last_minute_trades, function(trade){return trade.time;});
            var prices = _.pluck(last_minute_trades, "price");

            var last_price = parseFloat(prices[0]);
            var current_price = parseFloat(prices[prices.length-1]);
            return ((current_price-last_price)/last_price)*100;
        }
        return 0;
    }
    function get_trade_stats(public_trades){
        var prices = _.map(public_trades, function(trade){return parseFloat(trade.price.replace(',',''));});
        var stats = {
                    min_trade: nj.min(prices),
                    mean_trade: nj.mean(prices),
                    max_trade: nj.max(prices),
                    upper_quartile: nj.mean(prices) + nj.std(prices),
                    lower_quartile: nj.mean(prices) - nj.std(prices),
                    spread: nj.max(prices)-nj.min(prices)
                };
        return stats;
    }
    function get_public_trades(){
        debugger;
        var loading = $("#tradeHistory #divLoading").filter(function () { 
            return $(this).css("display") != 'none'; 
        });
        if(loading.length>0)
            return [];
        var public_trades=[];
        var $public_trades =  $("#tradeHistory .newtrade tr");
        $public_trades.each(function(){
            var trade = row_to_array(this);
            trade = _.object(["price","amount","time", "row"], trade);
            trade.time = moment(trade.time, 'HH:mm:ss');
            public_trades.push(trade);
        });
        return public_trades; 
    }
    function selected_pair(){
        return $(".selectsym[ng-class*='isOpened'] span:first").text();
    }
    function balance_to_usd(){
            var currency = selected_pair().split('/')[0];
            var usd_rate = $(".transMoney").text();
            usd_rate=usd_rate.replace("$","");
            usd_rate=usd_rate.replace(",","");
            usd_rate=usd_rate.replace(currency, '');
            usd_rate = parseFloat(usd_rate);
            var balance = $(".orderform div:not(.ng-hide) .f-fr .bid-div .f-fr").text();
            balance = parseFloat(balance.replace(currency, '').replace(' ',''));
            return balance*usd_rate;
    }
    function add_new_trades(all_trades)
    {
        var new_trades = get_public_trades();
        var times = _.pluck(all_trades, "time");
        var max_time = _.max(times);
        new_trades =_.filter(new_trades, function(trade){
                                            if(max_time < trade.time)
                                                return true;                
                                        });
        return new_trades;
    }
    function row_to_array(row){
        var $trade = $(row).find(".ng-binding");
        var trade = [];
        $trade.each(function(){
           trade.push($(this).html());
        });
        trade.push(row);
        return trade;
    }
};
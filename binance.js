(function() {
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
    var stats = get_trade_stats();
    var viewModel = {
        all_trades: get_public_trades(),
        min_trade: ko.observable(stats.min_trade),
        spread: ko.observable(stats.spread),
        max_trade: ko.observable(stats.max_trade),
        percentage1m: ko.observable(0),
        update : function(){
            this.all_trades = this.all_trades.concat(get_public_trades());
            this.percentage1m(calculate_1m_change(this.all_trades));
            var stats = get_trade_stats();
            this.min_trade(stats.min_trade);
            this.spread(stats.spread);
            this.max_trade(stats.max_trade);
        }
    };
    setInterval(function() {
        viewModel.update();
    }, 1000);
    // $("#stats").remove();
    var table = emmet.make("table.table#stats>tbody>tr>th{Max}+th{Min}");
    var row = emmet.make("tr>td[data-bind=text:max_trade]+td[data-bind=text:min_trade]");
    var row1 = emmet.make("tr>th{Spread}+td[data-bind=text:spread]");
    var row2 = emmet.make("tr>th{1 min % +/-}+td[data-bind=text:percentage1m]");
    //var row = emmet.make('tr>td[data-bind=text:max_trade]');
    console.log($(row));
    $(table).append($(row));
    $(table).append($(row1));
    $(table).append($(row2));
    console.log($(table).html());
    $("#tradeHistory .table:first").before(table);
    ko.applyBindings(viewModel, $("#stats")[0]);

    console.log(stats);
    var selected_pair = $(".selectsym[ng-class*='isOpened'] span:first").text();
    console.log(selected_pair);
    var selected_pair_trades = _.where(trades, {"pair": selected_pair});
    console.log(selected_pair_trades);

    if(selected_pair_trades.length > 0)
    {
        if("Sell" == selected_pair_trades[0].side)
        {
            var selected_pair_buy = _.where(selected_pair_trades, {"side": "Buy", "status":"Filled"});
            console.log(selected_pair_buy);
            if(selected_pair_buy.length > 0){
                var $row = selected_pair_trades[0].row;
                var sell_amount = parseFloat(_.first(selected_pair_trades).total);
                var buy_amount = parseFloat(_.first(selected_pair_buy).total);
                console.log(sell_amount+"-"+buy_amount);
                console.log(sell_amount-buy_amount);
                // $td = $("<td>").html((sell_amount-buy_amount))
                // $row.first().append($td);

            }
        }
    }
    function calculate_1m_change(trades){
        //debugger;
        if(trades.length>0){
            var now = _.pluck(trades, "time")[0];
            var last_minute_trades =_.filter(trades, function(trade){
                                                        if(30 >= now.diff(trade.time,"sec"))
                                                            return true;                
                                                    });
            var prices = _.pluck(last_minute_trades, "price");

            console.log("prices",prices);
            var current_price = parseFloat(prices[0]);
            var last_price = parseFloat(prices[prices.length-1]);
            return (current_price-last_price/last_price)*100;
        }
        return 0;
    }
    function get_trade_stats(){
        var public_trades=get_public_trades();
        var prices = _.map(public_trades, function(trade){return trade.price;});
        var stats = {
                    min_trade: nj.min(prices),
                    mean_trade: nj.mean(prices),
                    max_trade: nj.max(prices),
                    deviation: nj.std(prices),
                    spread: nj.max(prices)-nj.min(prices)
                };
        return stats;
    }
    function get_public_trades(){
        var public_trades=[]
        var $public_trades =  $("#tradeHistory .newtrade tr");
        $public_trades.each(function(){
            var trade = row_to_array(this);
            trade = _.object(["price","amount","time", "row"], trade);
            trade.time = moment(trade.time, 'HH:mm:ss')
            public_trades.push(trade);
        });
        return public_trades; 
    }
    function row_to_array(row){
        var $trade = $(row).find(".ng-binding");
        var trade = [];
        $trade.each(function(){
           trade.push($(this).html());
        });
        trade.push(row);
        return trade;
    };
})();
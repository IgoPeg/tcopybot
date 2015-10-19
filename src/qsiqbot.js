
var botAbort = function(msg) {
    msg = msg||'Bot beendet';
    alert(msg);
};

function Runden2Dezimal(x, y) {
    y = y || 100;
    return Math.round(x * y) / y;
}

var startQS = function () {

    var botResult = $('#botResult'),
        scope = [];

    var reset = function() {
        scope = {
            IQBV: {
                lastBBEMAValues: [],
                lastEMAValues: [],
                lastRSIValues: []
            },
            iqBot: {
                botSide: 'call'
            }
        };
    };

    reset();

    var isEMAinCloseMode = function () {

            var smaBBLastValue = scope.IQBV.lastBBEMAValues[0],
                smaLastValueOfData = scope.IQBV.lastEMAValues[1],
                smaCurrentValueOfData = scope.IQBV.lastEMAValues[0];

            /**
             * Hier muss sichergegangen werden, dass die EMA wirklich runter geht, und nicht
             * die BB EMA einfach entgegen kommt.
             */
            var breakDownTolerance = 0.00005;
            //console.log('breakDownTolerance', breakDownTolerance);
            if (smaLastValueOfData > 0) {
                if (smaCurrentValueOfData > smaBBLastValue) {
                    console.log(smaLastValueOfData, smaCurrentValueOfData);
                    console.log(smaLastValueOfData - smaCurrentValueOfData, 'smaLastValueOfData - smaCurrentValueOfData');
                    return ((smaLastValueOfData - smaCurrentValueOfData) > breakDownTolerance);
                } else {
                    console.log(smaCurrentValueOfData, smaLastValueOfData);
                    console.log(smaCurrentValueOfData - smaLastValueOfData, 'smaCurrentValueOfData - smaLastValueOfData');
                    return ((smaCurrentValueOfData - smaLastValueOfData) > breakDownTolerance);
                }
            } else {
                botAbort('SMA LAST VALUE = ', smaLastValueOfData);
            }

            return false;
        },

        isEMAsinCloseMode = function () {
            var anzahlLetzterDaten = 3;

            var smaBBLastValue = scope.IQBV.lastBBEMAValues[0],
                smaBBPreLastValue = scope.IQBV.lastBBEMAValues[1],
                smaBBPrePreLastValue = scope.IQBV.lastBBEMAValues[2];

            var smaLastValue = scope.IQBV.lastEMAValues[0],
                smaPreLastValue = scope.IQBV.lastEMAValues[1],
                smaPrePreLastValue = scope.IQBV.lastEMAValues[2];


            var lastEmaDifference = ((smaBBLastValue > smaLastValue) ? smaBBLastValue - smaLastValue : smaLastValue - smaBBLastValue) || 0,
                preLastEmaDifference = ((smaBBPreLastValue > smaPreLastValue) ? smaBBPreLastValue - smaPreLastValue : smaPreLastValue - smaBBPreLastValue) || 0,
                prePreLastEmaDifference = ((smaBBPrePreLastValue > smaPrePreLastValue) ? smaBBPrePreLastValue - smaPrePreLastValue : smaPrePreLastValue - smaBBPrePreLastValue) || 0;

            /**
             * Nähert sich eine möglich kreuzung an, so setze auf die Umkehr, solange die EMAs
             * nicht zu sehr beieinander sind (var emaTolerance) [Kann sein, dass bei der näheren annäherung
             * der Kurs wieder fällt.]
             * UND
             * und der EMA unterschied bisschen mehr als nur Micro Pips sind
             * Weil, die EMA, könnte sich nur tangieren, aber nicht kreuzen
             */

            var emaDifferenceTolerance = 0.00001;

            return (
                (
                    (lastEmaDifference + emaDifferenceTolerance) < preLastEmaDifference &&
                    (preLastEmaDifference + emaDifferenceTolerance) < prePreLastEmaDifference
                ) ||
                ((prePreLastEmaDifference - lastEmaDifference) / anzahlLetzterDaten) > emaDifferenceTolerance
            );
        },
        isRsiRevert = function() {

            /**
             * RSI Trendumkehr.
             * * Wenn RSI > 70 && RSI auf rückkehr && ist falsche richtung
             * * Wenn RSI < 30 && RSI auf rückkehr && ist falsche richtung
             */
            var anzahlLetztenDaten = 4;

            var lastSMADatas = [];

            for(var i = 1; i < anzahlLetztenDaten; i++) {
                lastSMADatas.push(scope.IQBV.lastRSIValues[i]);
            }

            var hightsValue = lastSMADatas.sort(sortAbsteigend)[0];
            var lowestValue = lastSMADatas.sort(sortAufsteigend)[0];

            /* Hole letzte RSI Data */
            var LastRSIData = scope.IQBV.lastRSIValues[0];

            var RSITollerance = 5;

            if (hightsValue >= 70 && LastRSIData < (70-RSITollerance)) {
                return true;
            } else if (lowestValue <= 30 && LastRSIData > (30+RSITollerance)) {
                return true;
            } else {
                return false;
            }

        },
        sortAufsteigend = function (a,b) { return a-b;},//1.2.3
        sortAbsteigend = function (a,b) { return b-a;},// 3.2.1
        getFormatedTime = function(ts) {
            var date = new Date(ts - 60);
            return ('0' + date.getDate()).slice(-2) + '/' + ('0' + (date.getMonth() + 1)).slice(-2) + '/' + date.getFullYear() + ' ' + ('0' + date.getHours()).slice(-2) + ':' + ('0' + date.getMinutes()).slice(-2);
        }
        ;


    var console = {log:function(msg) {window.console.log(arguments); msgs.push(Array.prototype.join.call(arguments, ' '));}};
    for(var d=0;d<datas.length;d++) {

        var data = datas[d];

        if(data !== '') {

            var row = $('<div></div>').appendTo(botResult),
                resultsSum = $('<div class="resultsSum"></div>').appendTo(botResult),
                trades = $('<div />').appendTo(row),
                tradeResults = $('<div />').appendTo(row),
                countTrades = 0,
                countCandles = 0,
                countWin = 0,
                countLoses = 0,
                countStops = 0,
                countPat = 0,
                maxSerialLoses = 0,
                tmpMaxSerialLoses = 0
                ;
            //data = JSON.parse(data);

            reset();

            var turanoTimeout = 0;

            var formattedDate = getFormatedTime(data.chart_points[0].close.time);

            $('<strong>' + formattedDate + '</strong>').prependTo(row);

            var msgs            = [];
            for (var i = 0; i < data.chart_points.length; i++) {
                //Aktuelle daten der kerze
                var candle          = data.chart_points[i],
                    candleEndTime   = candle.close.time,
                    candleTime      = getFormatedTime(candleEndTime),
                    candleRSI       = data.RSI[candleEndTime],
                    candleBBEMA     = data.BBEMA[candleEndTime],
                    candleEMA       = data.EMA[candleEndTime],
                    currentTradeDirection = scope.iqBot.botSide
                    ;

                if (!candleRSI || !candleBBEMA || !candleEMA) {
                    console.log('Für die Kerze', candle, 'fehlen Daten:');
                    console.log('candleRSI', candleRSI);
                    console.log('candleBBEMA', candleBBEMA);
                    console.log('candleEMA', candleEMA);
                }
                else {

                    //Setze aktuelle daten der kerze in das array
                    scope.IQBV.lastBBEMAValues.reverse().push(candleBBEMA.rate);
                    scope.IQBV.lastEMAValues.reverse().push(candleEMA.rate);
                    scope.IQBV.lastRSIValues.reverse().push(candleRSI.rate);

                    scope.IQBV.lastBBEMAValues.reverse();
                    scope.IQBV.lastEMAValues.reverse();
                    scope.IQBV.lastRSIValues.reverse();


                    //lege erst 3 Daten vorher an
                    if(i > 2) {

                        //Schreiben des aktuellen Trades
                        var status = (candle.open.rate < candle.close.rate) ? 'call' : 'put';
                        if (candle.open.rate == candle.close.rate) {
                            status = 'pat';
                            countPat++;
                        }

                        $(trades).append('<span class="candle candle--' + status + '">' +
                        '<div class="tooltip tooltip--bottom">' +
                        'Time:'+candleTime +
                        '<br/>candleOpen:'+ candle.open.rate +
                        '<br/>candleClose:'+ candle.close.rate +
                        '<br/>candleRSI:'+JSON.stringify(candleRSI) +
                        '<br/>candleBBEMA:'+JSON.stringify(candleBBEMA) +
                        '<br/>candleEMA:'+JSON.stringify(candleEMA) +
                        '</div>' +
                        '</span>');


                        //prüfen, ob die letzte Richtugssetzung richtig war
                        if (status == 'call' || status == 'put') {
                            if (status == currentTradeDirection) {
                                status = 'win';
                                countWin++;
                                tmpMaxSerialLoses = 0;
                            } else if(currentTradeDirection == 'stop') {
                                status = 'stop';
                                countStops++;
                            } else
                            {
                                status = 'lost';
                                countLoses++;
                                tmpMaxSerialLoses++;
                                if(maxSerialLoses<tmpMaxSerialLoses) {
                                    maxSerialLoses = tmpMaxSerialLoses;
                                }
                            }
                        }

                        $(tradeResults).append('<span class="candle candle--' + status + '">' +
                        '<div class="tooltip">' +
                        'Trade:' + currentTradeDirection + '<br/>' +
                        msgs.join("<br/>") +
                        '</div>' +
                        '</span>');


                        //leere nachrichten von der letzten kerze
                        msgs = [];

                        /**
                         * Berechnen des nächsten Trades, anhand der letzten kerzen daten
                         */
                        if(true) {

                            /**
                             * Logic Test
                             */
                            var smaBBLastValue = scope.IQBV.lastBBEMAValues[0];

                            var smaLastValue = scope.IQBV.lastEMAValues[0];

                            var emaUnterschied = ((smaBBLastValue > smaLastValue)?smaBBLastValue-smaLastValue:smaLastValue-smaBBLastValue)||0;

                            console.log('EMA unterschied bei ~' + Runden2Dezimal(emaUnterschied, 100000) + ' Punkten.');

                            if(false) {

                                /**
                                 * Theorie: Es wird nur in eine Richtug getradet
                                 * Aber nur wenn bestimmte signale stimmen.
                                 *
                                 * Start mit dem Trade
                                 * Signal: Wenn RSI in richtug runter
                                 * Signal: und EMAs klar sehr weit offen sind
                                 * Signal: und BB Linien weit offen
                                 *
                                 * Beende das Traden
                                 * Wenn die Signale nicht mehr vorhanden und letzter Trade im gewinn war.
                                 */

                                if(tmpMaxSerialLoses > 0) {

                                    //console.log('isEMAinCloseMode',xd);
                                    //var xy = isEMAsinCloseMode();
                                    //console.log('isEMAsinCloseMode', xy);
                                    //var rsi = isRsiRevert();
                                    //console.log('isRsiRevert', rsi);

                                    //if(isEMAinCloseMode()) {
                                    //    currentTradeDirection = (scope.IQBV.lastEMAValues[0] > scope.IQBV.lastBBEMAValues[0])?'put':'call';
                                    //}

                                    scope.iqBot.botSide = currentTradeDirection;
                                } else {

                                    if(emaUnterschied > 0.000175) {

                                        if(smaLastValue > smaBBLastValue) {

                                            if (
                                                scope.IQBV.lastRSIValues[0] > scope.IQBV.lastRSIValues[1] &&
                                                scope.IQBV.lastRSIValues[1] > scope.IQBV.lastRSIValues[2] &&
                                                scope.IQBV.lastRSIValues[2] > scope.IQBV.lastRSIValues[3] &&
                                                //scope.IQBV.lastRSIValues[3] > scope.IQBV.lastRSIValues[4] &&
                                                //scope.IQBV.lastRSIValues[0] > 55 &&

                                                scope.IQBV.lastEMAValues[0] > scope.IQBV.lastEMAValues[1] &&
                                                scope.IQBV.lastEMAValues[1] > scope.IQBV.lastEMAValues[2] &&
                                                scope.IQBV.lastEMAValues[2] > scope.IQBV.lastEMAValues[3] &&

                                                !isEMAsinCloseMode()
                                            ) {
                                                scope.iqBot.botSide = 'call';
                                            } else {
                                                scope.iqBot.botSide = 'stop';
                                            }

                                        }

                                        if(smaLastValue < smaBBLastValue) {
                                            if (
                                                scope.IQBV.lastRSIValues[0] < scope.IQBV.lastRSIValues[1] &&
                                                scope.IQBV.lastRSIValues[1] < scope.IQBV.lastRSIValues[2] &&
                                                scope.IQBV.lastRSIValues[2] < scope.IQBV.lastRSIValues[3] &&
                                                //scope.IQBV.lastRSIValues[3] < scope.IQBV.lastRSIValues[4] &&
                                                //scope.IQBV.lastRSIValues[0] < 45 &&

                                                scope.IQBV.lastEMAValues[0] < scope.IQBV.lastEMAValues[1] &&
                                                scope.IQBV.lastEMAValues[1] < scope.IQBV.lastEMAValues[2] &&
                                                scope.IQBV.lastEMAValues[2] < scope.IQBV.lastEMAValues[3] &&

                                                !isEMAsinCloseMode()
                                            ) {
                                                scope.iqBot.botSide = 'put';
                                            } else {
                                                scope.iqBot.botSide = 'stop';
                                            }
                                        }
                                    }
                                }

                            }
                            else
                            {

                                /**
                                 * Grobe Wechselprüfung mit tolerance
                                 */
                                if(emaUnterschied > 0.000075) {

                                    if(scope.iqBot.botSide == 'put' && smaLastValue > smaBBLastValue) {
                                        console.log('Wechsel Richtug zu call - smaLastValue > smaBBLastValue');
                                        scope.iqBot.botSide = 'call';
                                    }

                                    if(scope.iqBot.botSide == 'call' && smaLastValue < smaBBLastValue) {
                                        console.log('Wechsel Richtug zu put - smaLastValue < smaBBLastValue');
                                        scope.iqBot.botSide = 'put';
                                    }

                                }

                                if(scope.IQBV.lastRSIValues[0] < 45 || scope.IQBV.lastRSIValues[0] > 55) {
                                    /**
                                     * Wenn RSI > 70 && EMA nicht mehr in call richtung
                                     * Wenn RSI < 30 && EMA nicht mehr in put richtung
                                     */
                                    if (scope.IQBV.lastRSIValues[0] >= 70 && scope.IQBV.lastEMAValues[0] < scope.IQBV.lastEMAValues[1]) {
                                        scope.iqBot.botSide = 'put';
                                        console.log('Wechsel Richtug zu put wegen RSI >= 70 and EMA shows down');
                                    } else if (scope.IQBV.lastRSIValues[0] <= 30 && scope.IQBV.lastEMAValues[0] > scope.IQBV.lastEMAValues[1]) {
                                        scope.iqBot.botSide = 'call';
                                        console.log('Wechsel Richtug zu call wegen RSI <= 30 and EMA shows up');
                                    } else {

                                        //Wenn EMA unterschied größer ist dann, darf die Tradeumkehrlogik eingreifen (nach großen trends... bb offen.)
                                        //&& countSerialLooses < Math.round(alertByLooses/2)
                                        /* Wenn die EMA sich langsam wieder schließen, dann setzte in die gegenrichtung */
                                        var xd = isEMAinCloseMode();
                                        console.log('isEMAinCloseMode',xd);
                                        var xy = isEMAsinCloseMode();
                                        console.log('isEMAsinCloseMode', xy);
                                        var rsi = isRsiRevert();
                                        console.log('isRsiRevert', rsi);

                                        if((xd || xy) || rsi) {
                                            scope.iqBot.botSide = (scope.IQBV.lastEMAValues[0] > scope.IQBV.lastBBEMAValues[0])?'put':'call';
                                            console.log('Change direction ', scope.iqBot.botSide, ' because EMAs.');
                                        }
                                    }
                                }
                                else {
                                    console.log('RSI Block Auto-Revert', scope.IQBV.lastRSIValues[0]);
                                }


                            }

                            //Logic ENDE
                        }
                        else {
                            if(turanoTimeout <= 0 || tmpMaxSerialLoses === 0) {
                                /**
                                 * Turono Logic
                                 */
                                if(tmpMaxSerialLoses > 7) {
                                    scope.iqBot.botSide = (currentTradeDirection == 'call')?'put':'call';
                                    turanoTimeout = 8;
                                } else if(tmpMaxSerialLoses > 6) {
                                    scope.iqBot.botSide = (currentTradeDirection == 'call')?'put':'call';
                                    turanoTimeout = 7;
                                } else if(tmpMaxSerialLoses > 5) {
                                    scope.iqBot.botSide = (currentTradeDirection == 'call')?'put':'call';
                                    turanoTimeout = 6;
                                } else if(tmpMaxSerialLoses > 4) {
                                    scope.iqBot.botSide = (currentTradeDirection == 'call')?'put':'call';
                                    turanoTimeout = 5;
                                } else if(tmpMaxSerialLoses > 3) {
                                    scope.iqBot.botSide = (currentTradeDirection == 'call')?'put':'call';
                                    turanoTimeout = 4;
                                } else if(tmpMaxSerialLoses > 2) {
                                    scope.iqBot.botSide = (currentTradeDirection == 'call')?'put':'call';
                                    turanoTimeout = 3;
                                } else if(tmpMaxSerialLoses > 1) {
                                    scope.iqBot.botSide = (currentTradeDirection == 'call')?'put':'call';
                                    turanoTimeout = 2;
                                }
                            } else {
                                turanoTimeout--;
                            }
                        }

                        countCandles++;
                        if(status != 'stop') {
                            countTrades++;
                        }

                    }

                }

            }

            $('<span>Trades:'+countTrades+'</span>').appendTo(resultsSum);
            $('<span>TradesWin:'+countWin+' (' +countWin/countTrades*100+ '%)</span>').appendTo(resultsSum);
            $('<span>TradesLose:'+countLoses+' (' +countLoses/countTrades*100+ '%)</span>').appendTo(resultsSum);
            $('<span>TradesPat:'+countPat+' (' +countPat/countTrades*100+ '%)</span>').appendTo(resultsSum);
            $('<span>TradesStops:'+countStops+' (' +countStops/countCandles*100+ '%)</span>').appendTo(resultsSum);
            $('<span>maxSerialLoses :'+maxSerialLoses+'</span>').appendTo(resultsSum);
        }

    }
};
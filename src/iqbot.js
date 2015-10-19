void((function (d) {

    var logs = true;
    var console = {
        log: function(msg) {
            if(logs && window.console) {
                window.console.log(arguments);
            }
        },
        error: function(msg) {
            if(logs && window.console) {
                window.console.error(arguments);
            }
        },
        info: function(msg) {
            if(logs && window.console) {
                window.console.info(arguments);
            }
        },
        warn: function(msg) {
            if(logs && window.console) {
                window.console.warn(arguments);
            }
        }
    };

    var alert = function(msg) {
        window.alert(msg);
        console.log(msg);
    };

    var refID = '3793577';
    var promoSide = 'iqoption.com';
    if(window.location.href.indexOf(promoSide) == -1) {
        var x = confirm('Das Programm funktioniert nur auf ' + promoSide +  '. Möchten Sie dorthin weitergeleitet werden?');
        if(x) {
            window.location.href='https://' + promoSide + '/?ref='+refID;
        }
        return false;
    }

    var botAbort = function(msg) {
        msg = msg||'Bot beendet';
        alert(msg);
    };

    var $;
    if (!jQuery) {
        botAbort('jQuery nicht vorhanden');
        return false;
    } else {
        $ = jQuery;
    }

    if(typeof $.cookie != 'undefined') {
        if(!$.cookie('login')) {

            if(window.location.href.indexOf('/options') == -1) {
                $.cookie('ref', refID);
                botAbort('Bitte eröffnen Sie ein Konto, oder melden Sie sich mit Ihrem bestehenden Konto an, um auf die Handelsplattform zu gelangen.');
                return false;
            }

        }
    }

    if (!angular) {
        botAbort('AngularJS nicht vorhanden');
        return false;
    }

    function Runden2Dezimal(x, y) {
        y = y || 100;
        return Math.round(x * y) / y;
    }

    var run = function (scope) {

        try {

            if (scope.user) {

                var c = prompt('Wie hoch soll der Einsatz sein? (' + scope.user.profile.balance + ')');
                c = parseInt(c);
                if (!c) {
                    botAbort();
                    return false;
                }

                var upDown = prompt('Call oder Put?');
                upDown = (upDown == 'put' || upDown == 'call')?upDown.toLowerCase():false;
                if (!upDown) {
                    botAbort();
                    return false;
                }

                var alertByLooses = prompt('Bei wieviel hintereinander verlorenen Trades, moechten Sie eine Benachrichtiung bekommen? (Nur Zahlen groesser 0)');
                alertByLooses = parseInt(alertByLooses);
                if (!alertByLooses) {
                    botAbort();
                    return false;
                }

                var angsthase = confirm('Möchten Sie ab einer bestimmten Stufe nur den letzten Einsatz verdoppeln x(~2.1)? (Der Gewinn deckt nur die entstandenen Verluste)'),
                    littleDop = (angsthase) ? prompt('Ab welcher Stufe soll der letzte Einsatz multipliziert werden?') : false,
                    input = $('input[name=deposit]'),
                    form = input.closest('form'),
                /* Zuletzt gesetzter Betrag - dient zur Berechnung des Rettungs-Betrags */
                    lastSettedAmount = c,
                    penultimateSettedAmount = 0,
                /* Summe der Ketten-Verlusten */
                    moneyLost = 0,
                /* Summe des letzten Ketten-Verlusten */
                    lastMoneyLost = 0,
                /* Da der erste Trade manuell gestartet wird, muss hier der Counter auf 1 gesetzt werden. */
                    countSerialLooses = 1,
                /* Hier wird sich gemerkt, bis zum welchem Level das letzte mal erhöht werden musste (Nötig für korrekturen)*/
                    lastCountedSerialLooses = 0,
                /* maximaler einsatz pro Trade */
                    maxTradeVolumePerTrade = 950,
                    lastTradeStatus,
                    infoTextToHighTrade = 'ZU HOCH',
                    infoTextTradeAgain = 'NACHGESETZT',
                    infoTextTradeAgainInfo = true,
                    chartData = angular.element($('.my-chart canvas:first')).scope(),
                    RSIKey = chartData.RSI,
                    cChart = chartData._chart,
                    indicators = cChart.indicators,
                    strongAlert = 0.0005,
                    emaTolerance = 0.00015//Ab 0.0003 Punken (1 cm) unterschied sollte man sich gedanken um trendwechsel machen
                    ;

                if (typeof cChart == 'undefined') {
                    alert('Der Bot wurde zu früh gestartet, chart nicht verfügbar.');
                    return false;
                }

                if (c >= 1 && c <= scope.user.profile.balance && (upDown == 'put' || upDown == 'call')) {

                    if(input.length > 1 || !input.length) {
                        botAbort('System Error: Kein / mehrere Eingabefelder für den Betrag gefunden.');
                        return false;
                    }

                    input.val(c);
                    input.trigger('input');

                    scope.iqBot = {botSide: upDown, botValue: c, status: true, autotrading: false, autotrading_able:false, crasy:false};

                    var body = $('body'),
                        botBox = '<div id=\'botbox\' style=\'z-index:999;padding:10px;width:130px;background:yellow;border:3px dashed #000;position:absolute;top:63px;right: 243px;\'>' +
                            'Betrag: {{iqBot.botValue}}<br/>' +
                            '<div><label><input type=\'checkbox\' ng-model=\'iqBot.status\'> <span ng-show=\'!iqBot.status\' style=\'color:red;\'>OFF</span> <span ng-show=\'iqBot.status\' style=\'color:green;\'>ON</span></label></div>' +
                            '<div><label><input type=\'checkbox\' ng-model=\'iqBot.autotrading\' ng-disabled=\'!iqBot.autotrading_able || iqBot.crasy\'> Auto-Trade </label></div>' +
                            '<div><label><input type=\'checkbox\' ng-model=\'iqBot.crasy\' ng-disabled=\'iqBot.autotrading\'> Crasy-Bot</label></div>' +
                            '<div><label><input type=\'radio\' ng-disabled=\'iqBot.autotrading || iqBot.crasy\' ng-model=\'iqBot.botSide\' value=\'call\'> CAll </label></div>' +
                            '<div><label><input type=\'radio\' ng-disabled=\'iqBot.autotrading || iqBot.crasy\' ng-model=\'iqBot.botSide\' value=\'put\'> PUT </label></div>' +
                            '</div>';

                    angular.element(document).injector().invoke(
                        [
                            '$compile', function ($compile) {
                            var box = $compile($(botBox))(scope);
                            body.append(box);
                        }
                        ]);


                    var disableTrade = false;
                    var setTrade = function (value) {

                            if (!scope.iqBot.status) {
                                return false;
                            }

                            if (disableTrade) {
                                console.warn('Trade mit Volumen ' + value + ',- ist in die disableTrade-Falle gelaufen.');
                                return false;
                            }

                            value = Runden2Dezimal(value, 100);

                            disableTrade = true;

                            setTimeout(function () {

                                if (!input.length || input.length > 1) {
                                    alert('Keine oder zu viele Input gefunden input[name=deposit]');
                                } else {

                                    /* Counter Up: Trades in linie verloren*/
                                    console.log(countSerialLooses + '. Trade mit ' + value + ',- wird gesetzt.');

                                    input.focus();
                                    var doTrades = 1;
                                    if (value > maxTradeVolumePerTrade) {
                                        doTrades = Math.ceil(value / maxTradeVolumePerTrade);

                                        var dobbleTradesVolume = Runden2Dezimal(value / doTrades);
                                        console.log(doTrades, 'Trades a ', dobbleTradesVolume, ',-');
                                        input.val(dobbleTradesVolume);
                                        value = dobbleTradesVolume * doTrades;
                                    } else {
                                        input.val(value);
                                    }

                                    /*Trigger change for angular*/
                                    input.trigger('input');
                                    input.blur();

                                    if (form) {

                                        if(scope.iqBot.crasy) {
                                            scope.iqBot.botSide = (scope.iqBot.botSide == 'put')?'call':'put';
                                            console.log('iqBot.crasy on', scope.iqBot.botSide);
                                        }

                                        var button = $('.' + scope.iqBot.botSide + '-btn');
                                        if (button.length == 1) {
                                            var angularButtonObj = angular.element(button);
                                            if (doTrades > 1) {
                                                var click = function () {
                                                    angularButtonObj.trigger('click');
                                                };
                                                for (var i = 0; i < doTrades; i++) {
                                                    setTimeout(click, i * 200);
                                                }
                                            } else {
                                                angularButtonObj.trigger('click');
                                            }

                                            penultimateSettedAmount = lastSettedAmount;
                                            lastSettedAmount = value;

                                        } else {
                                            alert('Es existieren ' + button.length + ' ' + scope.iqBot.botSide + '-Buttons');
                                        }
                                    }
                                    else {
                                        alert('Input Form nicht gefunden');
                                    }
                                }
                            }, 0);

                            setTimeout(function () {
                                disableTrade = false;
                            }, 2000);
                        },

                        /**
                         * Info Handler für Trades, die NICHT durch den PipDifference Filter abgefangen wurden. (passiert eher selten)
                         *
                         * System dachte, dass der letzte Trade ist ein LOSE/PAT - war aber doch ein WIN.
                         * Dann hat das System bereits einen Rettungstrade abgesetzt. D.H Einsatz zu hoch -> User wird benachrichtigt = Bot Stoppt.
                         *
                         * FRAGE: Ist eine Benachrichtigung und somit Bot unterbrechnung nötig?
                         *
                         * * Hier muss geprüft werden, ob wirklich eine Unterbrechung nötig ist.
                         * * Bei kleinen Beträgen (Beträge, die unter der eingestellte Benachrichtungs-Grenze liegen)
                         * * sollte der Bot nicht unterbrochen werden,
                         * * da der Bot im Verlust-Fall locker Rettungstrades setzten kann.
                         * * * (Vorrausgesetzt, die Benachrichtigungsgrenze wurde korrekt gesetzt.)
                         */
                        toHighValueIn = function(toHighValue) {
                            setTimeout(function(){
                                if (countSerialLooses >= alertByLooses) {
                                    alert(infoTextToHighTrade + ' ' + toHighValue);
                                }
                            },2000);
                        },

                        sortAufsteigend = function (a,b) { return a-b;},//1.2.3
                        sortAbsteigend = function (a,b) { return b-a;},// 3.2.1

                        getBBEMAIndicatorName = function() {
                            var found = false;
                            $.each(Object.keys(scope.IQBV.indicators), function(key, indicatorName) {
                                if (indicatorName.slice(0, 2) == 'BB' &&
                                    indicatorName.substr(indicatorName.length-7) == 'typeSMA') {
                                    found = indicatorName;
                                    return false;
                                }
                            });
                            return found;
                        },

                        getEMAIndicatorName = function() {
                            var found = false;
                            $.each(Object.keys(scope.IQBV.indicators), function(key, indicatorName) {
                                if (indicatorName.slice(0, 3) == 'SMA' &&
                                    indicatorName.substr(indicatorName.length-7) == 'typeSMA') {
                                    found = indicatorName;
                                    return false;
                                }
                            });
                            return found;
                        },

                        getBoligerIndicatorName = function() {
                            var found = false;
                            $.each(Object.keys(scope.IQBV.indicators), function(key, indicatorName) {
                                if (indicatorName.slice(0, 2) == 'BB' &&
                                    indicatorName.substr(indicatorName.length-7) !== 'typeSMA') {
                                    found = indicatorName;
                                    return false;
                                }
                            });
                            return found;
                        },

                        isBBinCloseMode = function () {

                            var anzahlLetzterDaten = 3;

                            var BBTopLastValue = scope.IQBV.lastBBValues[0].tl.rate,
                                BBTopPreLastValue = scope.IQBV.lastBBValues[1].tl.rate,
                                BBTopPrePreLastValue = scope.IQBV.lastBBValues[2].tl.rate;

                            var BBBottomLastValue =  scope.IQBV.lastBBValues[0].bl.rate,
                                BBBottomPreLastValue =  scope.IQBV.lastBBValues[1].bl.rate,
                                BBBottomPrePreLastValue =  scope.IQBV.lastBBValues[2].bl.rate;

                            var BBDifferenceTolerance = 0.00003;

                            return !(
                                (
                                    ((BBTopLastValue + BBDifferenceTolerance) > BBTopPreLastValue && (BBTopPreLastValue + BBDifferenceTolerance)) > BBTopPrePreLastValue ||
                                    ((BBTopLastValue - BBTopPrePreLastValue) / anzahlLetzterDaten) > BBDifferenceTolerance
                                ) &&
                                (
                                    ((BBBottomLastValue + BBDifferenceTolerance) < BBBottomPreLastValue && (BBBottomPreLastValue + BBDifferenceTolerance)) < BBBottomPrePreLastValue ||
                                    ((BBBottomPrePreLastValue - BBBottomLastValue) / anzahlLetzterDaten) > BBDifferenceTolerance
                                )
                            );

                        },

                        getMinMultiplicator = function(currentPercent) {
                            currentPercent = parseFloat($('.profit-percent').text()) || currentPercent;

                            if(currentPercent.length == 3) {
                                currentPercent -= 100;
                            }

                            if(currentPercent > 1) {
                                currentPercent = currentPercent/100;
                            }

                            if(currentPercent > 0 && currentPercent >= 82) {
                                var r = 2+(1-currentPercent)+0.04;
                                return r;
                            } else {
                                return 2.22;
                            }
                        },

                        isEMAinCloseMode = function () {

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

                        toLowValueIn = function(toLowValue) {
                            if(infoTextTradeAgainInfo){
                                alert(infoTextTradeAgain +' - ' + toLowValue);
                            }
                        },

                        win = function () {
                            lastTradeStatus = 'win';
                            console.info('Trade win, Neue Trade-Kette wird gestartet.');

                            lastMoneyLost = moneyLost;
                            moneyLost = 0;

                            /*Zwischenspeichern für ggf korrektur*/
                            lastCountedSerialLooses = countSerialLooses;

                            /* Counter Reset: Trades in linie verloren */
                            countSerialLooses = 1;

                            setTrade(c);
                        },

                        pat = function (lastAmount) {
                            lastTradeStatus = 'pat';
                            console.info('Trade pat');
                            setTrade(lastAmount);
                        },

                        loose = function (lastAmount) {
                            lastTradeStatus = 'lose';
                            console.info('Trade lose');

                            /* Kalkuliere die letzten Verlusttrades bis hier hin */
                            moneyLost = moneyLost + lastAmount;

                            var saveInvest = moneyLost * 2;

                            if (littleDop !== false) {

                                if (countSerialLooses >= littleDop) {
                                    saveInvest = lastAmount * getMinMultiplicator();
                                }

                            }

                            /* Confirm bei dem 5 Lose */
                            if (countSerialLooses >= alertByLooses) {
                                var doContinue = confirm('Das ist der ' + countSerialLooses + '. verlorene Trade. Wollen Sie mit ' + saveInvest + ',-  weiter machen?');

                                if (!doContinue) {
                                    return false;
                                }
                            }

                            countSerialLooses++;

                            /* Neuen Trade setzten */
                            setTrade(saveInvest);
                        }

                        ;

                    scope.IQBV = {};
                    scope.IQBV.chart = angular.element($('.my-chart canvas:first')).scope();
                    scope.IQBV.indicators = scope.IQBV.chart._chart.indicators;

                    var init = true,
                        ratesTimeouts = [],
                        newOptionTimeOut = null,
                        tradeSettedMarker = false,
                        setTradeOnSuccess = true,
                    /*For ratesClosed watcher*/
                        initClosedRates = true,
                        bbEMAKey = getBBEMAIndicatorName(),
                        emaKey = getEMAIndicatorName(),
                        BBKey = getBoligerIndicatorName()
                        ;

                    if(bbEMAKey && emaKey) {
                        scope.$apply(function() {
                            scope.iqBot.autotrading_able = true;
                            scope.iqBot.autotrading = true;
                        });
                    }

                    if(RSIKey) {
                        scope.$watch("IQBV.indicators['" + RSIKey + "']", function(data,o) {

                            if(data) {
                                var dataKeys = Object.keys(data).sort(sortAbsteigend);
                                scope.IQBV.lastRSIValues = [];
                                scope.IQBV.lastRSIValues.push(data[dataKeys[0]].rate);
                                scope.IQBV.lastRSIValues.push(data[dataKeys[1]].rate);
                                scope.IQBV.lastRSIValues.push(data[dataKeys[2]].rate);
                                scope.IQBV.lastRSIValues.push(data[dataKeys[3]].rate);
                                scope.IQBV.lastRSIValues.push(data[dataKeys[4]].rate);
                            }

                        }, true);

                    }

                    if(BBKey) {
                        scope.$watch("IQBV.indicators['" + BBKey + "']", function(data,o) {

                            //bl: Object
                            //tl: Object
                            if(data) {
                                var dataKeys = Object.keys(data).sort(sortAbsteigend);
                                scope.IQBV.lastBBValues = [];
                                scope.IQBV.lastBBValues.push(data[dataKeys[0]]);
                                scope.IQBV.lastBBValues.push(data[dataKeys[1]]);
                                scope.IQBV.lastBBValues.push(data[dataKeys[2]]);
                                scope.IQBV.lastBBValues.push(data[dataKeys[3]]);
                                scope.IQBV.lastBBValues.push(data[dataKeys[4]]);
                            }

                        }, true);

                    }

                    if(emaKey) {
                        scope.$watch("IQBV.indicators['" + emaKey + "']", function(data,o) {

                            if(data) {
                                var dataKeys = Object.keys(data).sort(sortAbsteigend);
                                scope.IQBV.lastEMAValues = [];
                                scope.IQBV.lastEMAValues.push(data[dataKeys[0]].rate);
                                scope.IQBV.lastEMAValues.push(data[dataKeys[1]].rate);
                                scope.IQBV.lastEMAValues.push(data[dataKeys[2]].rate);
                            }

                        }, true);
                    }

                    if(bbEMAKey) {
                        scope.$watch("IQBV.indicators['" + bbEMAKey + "']", function(data,o) {

                            if(data) {
                                var dataKeys = Object.keys(data).sort(sortAbsteigend);
                                scope.IQBV.lastBBEMAValues = [];
                                scope.IQBV.lastBBEMAValues.push(data[dataKeys[0]].rate);
                                scope.IQBV.lastBBEMAValues.push(data[dataKeys[1]].rate);
                                scope.IQBV.lastBBEMAValues.push(data[dataKeys[2]].rate);
                            }

                        }, true);
                    }

                    scope.$watch('opt.ratesOpened', function (rates, oldRates) {

                        if (!init) {

                            if (!scope.iqBot.status) {
                                return false;
                            }

                            if (rates.length >= oldRates.length) {
                                tradeSettedMarker = true;
                                initClosedRates = false;
                            }

                            rates.forEach(function (rate, i) {

                                if (ratesTimeouts.indexOf(rate.key) == -1) {

                                    clearTimeout(newOptionTimeOut);
                                    newOptionTimeOut = setTimeout(function () {

                                        if(typeof console != 'undefined' && scope.iqBot.status) {
                                            //console.clear();
                                        }

                                        setTradeOnSuccess = true;

                                        var newOptionButton = $('button.btn-new-option');
                                        if (newOptionButton.length == 1) {
                                            angular.element(newOptionButton).trigger('click');
                                        } else {
                                            console.error('Es wurde kein "Neuer Trade" Button gefunden.');
                                        }

                                        setTimeout(function() {
                                            var call    = $('.call-btn:disabled'),
                                                put     = $('.put-btn:disabled')
                                                ;

                                            if(call.length || put.length) {
                                                alert('Die Buttons sind immernoch deaktiviert - ist ein Fehler aufgetreten?');
                                            }
                                        }, 2000);

                                    }, 25000);

                                    var dataF = new Date(),
                                        currentTime = dataF.getTime(), //scope.currentTime || ,
                                        sek = (rate.exp - Math.round(currentTime / 1000) - 0.2) * 1000;

                                    console.log('Erwarte beendung des letzten Trades in', Runden2Dezimal(sek / 1000), 'Sekunden.');

                                    setTimeout(function () {

                                        if (!scope.iqBot.status) {
                                            return false;
                                        }


                                        if(typeof rate.list == 'undefined' || rate.list.length === 0) {
                                            console.log('rate.list in nicht vorhanden oder leer');
                                        }

                                        /**
                                         * Wenn das System entscheidet, dass der Vorraussichtliche gewinn nicht sicher ist,
                                         * wird die Variable setTradeOnSuccess = true gesetzt.
                                         * Dadurch wird der nächte Trade erst nach wirklichem beenden des aktuellen Trades gesetzt
                                         * um Fehl-Trade zu verringern.
                                         */

                                        //rate.list.forEach(function (trade, j) {

                                            var trade = rate.list[0];

                                            if(trade && trade.value) {

                                                var openedPoints = trade.value;
                                                var currentPoints = cChart.barometerShowVal;
                                                /*console.log('openedPoints: ' + openedPoints, 'currentPoints: '+ currentPoints,'cChart: ',cChart);*/

                                                var punkteUnterschied = ((currentPoints > openedPoints)?currentPoints-openedPoints:openedPoints-currentPoints)||0;

                                                console.log(lastSettedAmount+',- Trade wird mit ~' + Runden2Dezimal(punkteUnterschied, 100000) + ' Punkten unterschied beendet.');

                                                if ( punkteUnterschied < 0.00005 ) {
                                                    console.log('Warte auf End-Ergebnis vom Trade..');
                                                } else {
                                                    setTradeOnSuccess = false;
                                                    console.log('Setzte Trade früher, da Verlust oder Gewinn gewiss sind');
                                                }

                                            } else {
                                                console.warn('Ein Trade konnte vor Ablauf nicht mehr geprueft werden.');
                                            }

                                        //});

                                        /**
                                         * Automatische wechsel-logic
                                         *
                                         * Wenn die SMA unter der
                                         * Boliger Bänder SMA ist, dann soll PUT getraded werden und ungekehrt.
                                         *
                                         * Sicherheitsmassname: Wenn zu viele Trades verloren wurden (alertByLooses/2 z.B 9/2 = 4,5 ~ 5)
                                         * Immer in die letzte richtung weiter Traden bis win.
                                         */
                                        if(scope.iqBot.autotrading && scope.iqBot.autotrading_able) {

                                            var smaBBLastValue = scope.IQBV.lastBBEMAValues[0];

                                            var smaLastValue = scope.IQBV.lastEMAValues[0];

                                            var emaUnterschied = ((smaBBLastValue > smaLastValue)?smaBBLastValue-smaLastValue:smaLastValue-smaBBLastValue)||0;

                                            console.log('EMA unterschied bei ~' + Runden2Dezimal(emaUnterschied, 100000) + ' Punkten.');

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

                                        if( !setTradeOnSuccess ) {

                                            if (rate.win) {

                                                if (rate.profit > rate.deposit) {
                                                    win();
                                                } else {
                                                    pat(rate.deposit);
                                                }

                                            } else {
                                                loose(rate.deposit);
                                            }
                                        }

                                        setTimeout(function () {
                                            if (tradeSettedMarker) {
                                                tradeSettedMarker = false;
                                                console.log('Log: Trade wurde erfolgreich gesetzt.');
                                            } else {
                                                alert('Fehler: Es müsste jetzt eigentlich ein neuer Trade gesetzt worden sein. Bitte prüfen.');
                                            }
                                        }, 10000);

                                    }, sek);

                                    ratesTimeouts.push(rate.key);
                                }
                            });

                        } else {
                            init = false;
                        }

                    }, true);

                    var lastClosedRate = null;
                    scope.$watch('opt.ratesClosed', function (closedRates) {

                        if (!initClosedRates) {

                            if (!scope.iqBot.status) {
                                return false;
                            }

                            var lastRate = closedRates[closedRates.length - 1];

                            if (lastClosedRate && lastClosedRate != lastRate && ratesTimeouts.indexOf(lastRate.key) > -1) {

                                if (lastRate.win) {

                                    if (lastRate.profit > lastRate.deposit) {
                                        /*console.log('last win', lastRate);*/

                                        if(setTradeOnSuccess) {
                                            win();
                                            setTradeOnSuccess = false;
                                            return;
                                        }

                                        if (lastTradeStatus != 'win') {

                                            /**
                                             *  Es wurde geglaubt, dass der letzte Trade ein PAT war - dabei war es wirklich ein WIN.
                                             *  IST: Das System hat bereits den höheren PAT Betrag gesetzt.
                                             *  SOLL: Der User muss benachricht werden
                                             */
                                            if (lastTradeStatus == 'pat') {
                                                console.warn('WIN NICHT PAT: Es ist ein zu hoher Betrag im Trade', lastSettedAmount);
                                                toHighValueIn(lastSettedAmount);
                                            }
                                            /**
                                             *  Es wurde geglaubt, dass der letzte Trade ein LOSE war - dabei war es wirklich ein WIN.
                                             *  IST: Das System hat bereits die Trade-Katte Forgesetzt gesetzt.
                                             *  SOLL: Der User muss informiert werden, dass ein zu hoher Betrag gesetzt wurde.
                                             */
                                            else if (lastTradeStatus == 'lose') {
                                                console.warn('WIN NICHT LOSE: Es ist ein zu hoher Betrag im Trade', lastSettedAmount);
                                                toHighValueIn(lastSettedAmount);
                                            }

                                        }

                                    } else {
                                        /*console.log('last pat', lastRate);*/

                                        if(setTradeOnSuccess) {
                                            pat(lastRate.deposit);
                                            setTradeOnSuccess = false;
                                            return;
                                        }

                                        if (lastTradeStatus != 'pat') {

                                            /**
                                             *  Es wurde geglaubt, dass der letzte Trade ein win war - dabei war es wirklich ein PAT.
                                             *  IST: Das System hat bereits eine neue Trade-Kette mit Eingestellten Tradeeinsatz gesetzt.
                                             *  SOLL: Der aktuelle Trade muss um den soll Patbetrag erweitert werden (vorletzter Betrag - aktueller Betrag)
                                             */
                                            if (lastTradeStatus == 'win') {
                                                var korrekturBetrag = penultimateSettedAmount - lastSettedAmount;
                                                disableTrade = false;
                                                setTrade(korrekturBetrag);
                                                console.warn('PAT NICHT WIN: Trade mit', korrekturBetrag, 'wurde nachgesetzt');
                                                toLowValueIn(korrekturBetrag);
                                            }
                                            /**
                                             *  Es wurde geglaubt, dass der letzte Trade ein LOSE war - dabei war es wirklich ein PAT.
                                             *  IST: Das System hat den letzten Einsatz bereits erneut gesetzt.
                                             *  SOLL: Der User muss informiert werden, dass ein zu hoher Betrag gesetzt ist.
                                             */
                                            else if (lastTradeStatus == 'lose') {
                                                console.warn('PAT NICHT LOSE: Es ist ein zu hoher Betrag im Trade', lastSettedAmount);
                                                toHighValueIn(lastSettedAmount);
                                            }
                                        }
                                    }
                                }
                                else
                                {
                                    /*console.log('last lose', lastRate);*/

                                    if(setTradeOnSuccess) {
                                        loose(lastRate.deposit);
                                        setTradeOnSuccess = false;
                                        return;
                                    }

                                    if (lastTradeStatus != 'lose') {

                                        /* Betrag der eigentlich gesetzt werden sollte */
                                        var sollLoseBetrag = (lastMoneyLost + penultimateSettedAmount) * 2,
                                            additionalInvest
                                            ;

                                        /*
                                         Ist der Fehlerhafte letzte Trade in einer reihe Fehlertrades
                                         und die Anzahl der Fehlertrades übersteigt den Verdoppelungslimit,
                                         dann ist der sollLoseBetrag nur der letzte Betrag * 2.22 */
                                        if (littleDop !== false) {
                                            if (lastCountedSerialLooses >= littleDop) {
                                                sollLoseBetrag = penultimateSettedAmount * getMinMultiplicator();
                                            }
                                        }

                                        /**
                                         *  Es wurde geglaubt, dass der letzte Trade ein PAT war - dabei war es wirklich ein LOSE.
                                         *  IST: Das System hat bereits eine neuen Trade mit dem PAT Betrag gesetzt.
                                         *  SOLL: Der aktuelle Trade muss um den fehlenden Betrag erweitert werden +(Soll losebetrag - aktueller Betrag)
                                         */
                                        if (lastTradeStatus == 'pat') {
                                            additionalInvest = sollLoseBetrag - lastSettedAmount;
                                            disableTrade = false;
                                            setTrade(additionalInvest);
                                            console.warn('LOSE NICHT PAT: Trade mit', additionalInvest, 'wurde nachgesetzt');
                                            toLowValueIn(additionalInvest);
                                        }
                                        /**
                                         *  Es wurde geglaubt, dass der letzte Trade ein WIN war - dabei war es wirklich ein LOSE.
                                         *  IST: Das System hat den Eingestellten Tradeeinsatz gesetzt.
                                         *  SOLL: Der aktuelle Trade muss um den fehlenden Betrag erweitert werden +(Soll losebetrag - aktueller Betrag)
                                         */
                                        else if (lastTradeStatus == 'win') {
                                            additionalInvest = sollLoseBetrag - lastSettedAmount;
                                            disableTrade = false;
                                            setTrade(additionalInvest);
                                            console.warn('LOSE NICHT WIN: Trade mit', additionalInvest, 'wurde nachgesetzt');
                                            toLowValueIn(additionalInvest);
                                        }
                                    }
                                }
                            }

                            lastClosedRate = lastRate;

                        }

                    });

                }
                else {
                    alert('Falscher Einsatz oder falsche Call/Put Option');
                }

            } else {
                alert('error scope.user');
            }


        } catch ($e) {
            botAbort('Beim Programm wurde ein Fehler festgestellt.. Bitte kontakieren Sie den Erbauer - Igor Peguschin - mit folgender Nachricht:' + "\n\n Error:" + $e);
        }

    };

    var versuchCount = 1;
    var getScope = function () {

        var scope = angular.element('body').scope();

        if (typeof scope != 'undefined') {
            run(scope);
        } else {

            if (versuchCount >= 3) {
                console.error('Scope wurde nach ' + versuchCount + ' versuchen nicht gefunden, script bricht ab.');
            } else {
                versuchCount++;
                console.info('Versuch ' + versuchCount + ' $scope konnte nicht gefunden werden, versuche nochmal nochmal');

                setTimeout(function () {
                    getScope();
                }, 3000);
            }
        }

    };
    getScope();

})(document));
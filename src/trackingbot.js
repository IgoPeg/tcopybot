void((function (d) {

    var alert = function (msg) {
        window.alert(msg);
        console.log(msg);
    };

    var botAbort = function (msg) {
        msg = msg || 'Bot beendet';
        alert(msg);
    };

    var $;
    if (!jQuery) {
        botAbort('jQuery nicht vorhanden');
        return false;
    } else {
        $ = jQuery;
    }

    if (!angular) {
        botAbort('AngularJS nicht vorhanden');
        return false;
    }

    var run = function (scope) {

        try {
            var chartData = angular.element($('.my-chart canvas:first')).scope(),
                RSIKey = chartData.RSI,
                cChart = chartData._chart,
                indicators = cChart.indicators
                ;

            if (typeof cChart == 'undefined') {
                alert('Der Bot wurde zu früh gestartet, chart nicht verfügbar.');
                return false;
            }

            scope.iqBot = {status: true, showData: false, data: {}};

            var body = $('body'),
                botBox = '<div id=\'botbox\' style=\'z-index:999;padding:10px;width:130px;background:yellow;border:3px dashed #000;position:absolute;top:63px;right: 243px;\'>' +
                    '<div><label><input type=\'checkbox\' ng-model=\'iqBot.showData\'> Data-Log</label></div>' +
                    '<div ng-show="iqBot.showData" style="position: absolute; z-index: 999; right:0; top:0; width: 500px; max-height: 500px; overflow:auto; margin-right: -5px; margin-top: -5px;">' +
                    '<button ng-click="iqBot.showData = false;" style="float: right">X</button>' +
                    '<pre style="white-space: nowrap;overflow-x:auto;">{{iqBot.data|json}}</pre>' +
                    '</div>' +
                    '</div>';

            angular.element(document).injector().invoke(
                [
                    '$compile', function ($compile) {
                    var box = $compile($(botBox))(scope);
                    body.append(box);
                }
                ]);

            var getBBEMAIndicatorName = function () {
                    var found = false;
                    $.each(Object.keys(indicators), function (key, indicatorName) {
                        if (indicatorName.slice(0, 2) == 'BB' &&
                            indicatorName.substr(indicatorName.length - 7) == 'typeSMA') {
                            found = indicatorName;
                            return false;
                        }
                    });
                    return found;
                },

                getEMAIndicatorName = function () {
                    var found = false;
                    $.each(Object.keys(indicators), function (key, indicatorName) {
                        if (indicatorName.slice(0, 3) == 'SMA' &&
                            indicatorName.substr(indicatorName.length - 7) == 'typeSMA') {
                            found = indicatorName;
                            return false;
                        }
                    });
                    return found;
                },

                getBoligerIndicatorName = function () {
                    var found = false;
                    $.each(Object.keys(indicators), function (key, indicatorName) {
                        if (indicatorName.slice(0, 2) == 'BB' &&
                            indicatorName.substr(indicatorName.length - 7) !== 'typeSMA') {
                            found = indicatorName;
                            return false;
                        }
                    });
                    return found;
                }

                ;

            var bbEMAKey = getBBEMAIndicatorName(),
                emaKey = getEMAIndicatorName();

            scope.IQBV = {};
            scope.IQBV.chart = angular.element($('.my-chart canvas:first')).scope();
            scope.IQBV.indicators = scope.IQBV.chart._chart.indicators;

            if (RSIKey) {
                scope.iqBot.data.RSI = scope.IQBV.indicators[RSIKey];
            }

            if (emaKey) {
                scope.iqBot.data.EMA = scope.IQBV.indicators[emaKey];
            }

            if (bbEMAKey) {
                scope.iqBot.data.BBEMA = scope.IQBV.indicators[bbEMAKey];
            }

            var initChartPointsRecord = true;
            scope.iqBot.data.chart_points = angular.copy(scope.IQBV.chart._chart.chart.drawPointsArr.reverse());
            scope.$watch("IQBV.chart.countdown", function (data, o) {

                if (!initChartPointsRecord) {
                    var point = scope.IQBV.chart._chart.chart.drawPointsArr[1];
                    delete point.points;
                    scope.iqBot.data.chart_points.push(point);
                }

                initChartPointsRecord = false;
            });

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
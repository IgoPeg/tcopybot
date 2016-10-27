void((function (d) {

  if (!!window.tcopyBot) {
    window.alert('Der TCopyBot läut bereits. Bitte laden Sie die Seite neu.');
    return false;
  }

  window.tcopyBot = true;

  var botAbort = function (msg) {
    msg = msg || 'Bot beendet';
    window.alert(msg);
  };

  var $;
  if (!jQuery) {
    botAbort('jQuery nicht vorhanden');
    return false;
  } else {
    $ = jQuery;
  }

  if (!$) {
    botAbort('Jquery nicht vorhanden');
    return false;
  }

  function copyToClipboard(text) {
    setTimeout(function() { window.prompt("Copy to clipboard: Ctrl+C, Enter", text); }, 1000);
  }

  var run = function () {

    try {

      var brokerHostname = window.location.hostname;

      //If 24Option
      if (brokerHostname.indexOf('24option') > -1) {

        var getAsset = function() {

          var optionsContainer = $('.options_container');

          var childrens = optionsContainer.children();

          if (optionsContainer.length) {

            if (childrens.length) {

              var selectedAsset = optionsContainer.find('.option_row_container_selected');

              if (selectedAsset.length) {

                var data = [];
                data.asset = selectedAsset.find('.option_row_asset').text();
                data.direction = $('.position_type_action_button_selected').text();
                data.entry = selectedAsset.find('.option_row_target').text();
                data.until = selectedAsset.find('.option_row_expiry select > option:selected').text();
                return data;

              } else {
                console.error('Kein ausgewähltes Assets gefunden.');
              }

            } else {
              console.error('Keine Assets gefunden.');
            }

          } else {
            console.error('Asset-Container nicht gefunden.');
          }

        };

        var actionButton = $('.option_mode_buy_button');

        actionButton.on('click', function () {

          var data = getAsset();

          if (data.asset && data.direction && data.until && data.entry) {
            var text = data.asset + ' ' + data.direction + ' ' + data.until + ' ' + data.entry;
            copyToClipboard(text.replace(/\s\s+/g, ' '));
          } else {
            var error = 'Fehler beim sammeln der Trade-Daten. Es wurden nur folgende Werte gefunden: ' + data.join(data);
            console.error(error);
          }

        });

      }

    } catch ($e) {

      botAbort('Beim Programm wurde ein Fehler festgestellt.. Bitte kontakieren Sie den Erbauer - Igor Peguschin - mit folgender Nachricht:' + "\n\n Error:" + $e);

    }

  };

  var versuchCount = 1;
  var getScope = function () {

    // var scope = angular.element('body').scope();

    if (true) {
      run();
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
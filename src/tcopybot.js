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
    setTimeout(function () {
      window.prompt("Copy to clipboard: Ctrl+C, Enter", text);
    }, 1000);
  }

  function getAsset() {

    var optionsContainer = $('#bmBidder');

    var data = [];
    data.asset = optionsContainer.find('.bmTradingBoxAsset').text();
    data.entry = optionsContainer.find('.bmOptionPrice>.bmPriceValue').text();
    data.until = $('#bmOptionSelector .bmUiSelectLabelText.bmUiSelectDynamicLabel').text();
    return data;

  }


  function initAsset() {

    // set Button watcher if time has changed
    $('#bmOptionSelector ul.bmUiList>li').on('click', function () {
      setTimeout(setButtonWatcher, 500);
    });

    setButtonWatcher();

  }

  function setButtonWatcher() {

    // Buttons
    var callButton = $('.bmButtonsWrapp.bmSelection1');
    var putButton = $('.bmButtonsWrapp.bmSelection2');

    callButton.on('click',function () {

      //Holen des ausgewählten Trades
      var data = getAsset();
      data.direction = 'CALL';

      //Generieren des zu kopierenden Text wenn alle Informationen da sind.
      if (data.asset && data.direction && data.until && data.entry) {
        var text = data.asset + ' ' + data.direction + ' ' + data.until + ' ' + data.entry;
        copyToClipboard(text.replace(/\s\s+/g, ' '));
      } else {
        var error = 'Fehler beim sammeln der Trade-Daten. Es wurden nur folgende Werte gefunden: ' + data.join(data);
        console.error(error);
      }

    });


    putButton.on('click', function () {

      //Holen des ausgewählten Trades
      var data = getAsset();
      data.direction = 'PUT';

      //Generieren des zu kopierenden Text wenn alle Informationen da sind.
      if (data.asset && data.direction && data.until && data.entry) {
        var text = data.asset + ' ' + data.direction + ' ' + data.until + ' ' + data.entry;
        copyToClipboard(text.replace(/\s\s+/g, ' '));
      } else {
        var error = 'Fehler beim sammeln der Trade-Daten. Es wurden nur folgende Werte gefunden: ' + data.join(data);
        console.error(error);
      }

    });

  }

  var run = function () {

    try {

      var brokerHostname = window.location.hostname;

      //If 24Option
      if (brokerHostname.indexOf('24option') > -1) {

        var assetsContainer = $('#bmTradeGame'),
            assetsList      = assetsContainer.find('ul.bmOptionList'),
            assetsListItem  = assetsList.find('li.bmOption')
          ;

        //reinit on selectAsset
        assetsListItem.on('click', function () {
          setTimeout(initAsset, 500);
        });

        initAsset();

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
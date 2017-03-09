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
    window.prompt("Copy to clipboard: Ctrl+C, Enter", text);
  }

  function getAsset(optionsContainer) {

    var data = [];
    data.direction = (optionsContainer.hasClass('bmDown')) ? 'PUT' : 'CALL';
    var assetText = optionsContainer.find('.bmAsset .bmCellContent').text();
    data.asset = assetText.split(' #')[0];
    data.entry = optionsContainer.find('.bmTarget .bmCellContent').text();
    data.until = optionsContainer.find('.bmExpires').text();
    return data;

  }

  var findInterval;
  var inizialized = false;
  function init() {

    var box = $('#bmActiveTrades');

    if (box.length && !inizialized) {

      inizialized = true;
      clearInterval(findInterval);

      box.on('click', function (e) {

        var tradeRow = $(e.target).closest('li');

        if (tradeRow.length && tradeRow.hasClass('bmPosition') && e.ctrlKey) {
          var data = getAsset(tradeRow);

          //Generieren des zu kopierenden Text wenn alle Informationen da sind.
          if (data.asset && data.direction && data.until && data.entry) {
            var text = data.asset + ' ' + data.direction + ' ' + data.until + ' ' + data.entry;
            copyToClipboard(text.replace(/\s\s+/g, ' '));
          } else {
            var error = 'Fehler beim sammeln der Trade-Daten. Es wurden nur folgende Werte gefunden: ' + data.join(data);
            console.error(error);
          }
        }

      });

    } else {
      findInterval = setInterval(init, 2000);
    }

  }

  var run = function () {

    try {

      var brokerHostname = window.location.hostname;

      //If 24Option
      if (brokerHostname.indexOf('24option') > -1) {
        init();
      }

    } catch ($e) {

      botAbort('Beim Programm wurde ein Fehler festgestellt.. Bitte kontakieren Sie den Erbauer - Igor Peguschin - mit folgender Nachricht:' + "\n\n Error:" + $e);

    }

  };

  run();

})(document));
app.controller('MainCtrl', function($rootScope, $scope, $routeParams, $location, $timeout, $q, data) {
  'use strict';

  var model = $scope.model = {};

  model.picture = {};
  model.person = {};
  model.details = {};
  model.email = {};
  model.url = {};

  model.cardPictureFile = '';
  model.cardPicture = '';
  model.generatingCard = false;
  model.generatingPdf = false;

  model.imageData = '';
  model.imageFilename = 'bizcardmaker-com.jpg';

  model.pdfData = '';
  model.pdfFilename = 'bizcardmaker-com.pdf';

  model.cardDefaults = {
    name: 'John Doe',
    position: 'Position',
    organization: 'Organization',
    location: 'City, State',
    phone: '(123) 555-1234',
    email: 'john.doe@cmail.com',
    url: 'www.john-doe.com'
  };

  model.card = {};

  angular.copy(model.cardDefaults, model.card);

  var storedCard = window.localStorage.getItem('bizcardmaker-card');

  if(storedCard) {
    angular.copy(angular.fromJson(storedCard), model.card);
  }

  // Remy Sharp's debounce
  // https://remysharp.com/2010/07/21/throttling-function-calls
  var debounce = function(fn, delay) {
    var timer = null;
    return function () {
      var context = this, args = arguments;
      clearTimeout(timer);
      timer = setTimeout(function () {
        fn.apply(context, args);
      }, delay);
    };
  };

  // save edits to localstorage
  $scope.$watch('model.card', debounce(function(card) {

    window.localStorage.setItem('bizcardmaker-card', angular.toJson(card));

  }, 500), true);

  // reset all saved data
  $scope.ResetCard = function() {

    angular.copy(model.cardDefaults, model.card);

    window.localStorage.removeItem('bizcardmaker-card');

  };

  // ugly detection for ugly Safari
  model.isSafari = (navigator.userAgent.indexOf('Safari') !== -1 && navigator.userAgent.indexOf('Chrome') === -1);

  var clearInlineStyles = function() {
    // clear all inline styles
    // generated by editor and draggable
    var cardChildren = document.querySelector('.card-preview').querySelectorAll('*');
    angular.forEach(cardChildren, function(c) {
      c.removeAttribute('style');
    });
  };

  model.themes = [];

  var colors = [
    'black',
    'white',
    'blue',
    'dark-blue',
    'turquoise',
    'red',
    'orange',
    'green',
    'dark-green',
    'pink',
    'purple'
  ];

  var themes = [
    'theme-topline',
    'theme-simple',
    'theme-corners',
    'theme-half',
    'theme-border',
    'theme-line',
    'theme-third'
  ];

  angular.forEach(themes, function(theme) {

    angular.forEach(colors, function(color) {

      if(
        (theme === 'theme-half' ||
        theme === 'theme-border' ||
        theme === 'theme-third' ||
        theme === 'theme-line'||
        theme === 'theme-topline') &&
        color === 'white'
      ) {

      } else {
        model.themes.push({
          name: theme + '--' + color
        });
      }

    });

  });

  [].push.apply(model.themes, [
    {
      name: 'theme-diagonals'
    }
  ]);

  [].unshift.apply(model.themes, [
    {
      name: 'theme-autumn--half'
    },
    {
      name: 'theme-autumn--half-black'
    },
    {
      name: 'theme-autumn--top'
    },
    {
      name: 'theme-autumn--top-black'
    }
  ]);

  $scope.$on('$routeUpdate', function(){
    model.activeTheme = $routeParams.theme;

    // select the first theme if no theme selected
    if(!model.activeTheme && model.themes.length) {
      $location.search('theme', model.themes[0].name);
    }

    // reset editor and position changes on elements
    clearInlineStyles();

  });

  $scope.$watch('model.cardPictureFile', function() {

    if(model.cardPictureFile) {

      var imageType = /image.*/;

      if (model.cardPictureFile.type.match(imageType)) {
        var reader = new FileReader();

        reader.onload = function() {

          $timeout(function() {
            model.cardPicture = reader.result;
          });

        };

        reader.readAsDataURL(model.cardPictureFile);

      } else {

        window.alert('File not supported!');

      }

    }

  });

  /* Turn px values into em
   */
  var pxToEm = function(elem) {

    var parentStyle = window.getComputedStyle(elem.parentNode, null);
    var style = window.getComputedStyle(elem, null);
    var childFontSize = parseInt(style.fontSize, 10);
    var parentFontSize = parseInt(parentStyle.fontSize, 10);

    var properties = [ 'left', 'top', 'width', 'height' ];
    var inlineStyleValue = '';

    properties.forEach(function(prop) {

      inlineStyleValue = elem.style[prop];

      // only if the property is set as inline style
      if(inlineStyleValue && inlineStyleValue.indexOf('em') === -1) {

        var childValue = parseInt(style[prop], 10);
        var newValue = Math.floor((childValue / parentFontSize) * 100) / 100;

        newValue = newValue * (parentFontSize / childFontSize);

        elem.style[prop] = newValue + 'em';

      }

    });

    if(style.fontSize.indexOf('em') === -1) {
      elem.style.fontSize = childFontSize / parentFontSize + 'em';
    }


  };

  var fontSizes = {
    '1': '10',
    '2': '13',
    '3': '16',
    '4': '18',
    '5': '24',
    '6': '32',
    '7': '48'
  };

  // replace px styles and font sizes generated by the editor
  // so that I can later enlarge the entire business card with ems
  var fixPxSizes = function(container) {
    var editors = container.querySelectorAll('[contenteditable]');

    var children;

    angular.forEach(editors, function(e) {
      children = e.querySelectorAll('*');
      angular.forEach(children, function(c) {
        // first turn font size=x to px
        if(c.tagName === 'font') {
          c.style.fontSize = fontSizes[c.size] + 'px';
        }

        pxToEm(c);
      });
    });

    // fix dragged possitions
    var lists = container.querySelectorAll('.card-item[style]');
    var picture = container.querySelector('.card-picture[style]');

    angular.forEach(lists, function(li) {
      pxToEm(li);
    });

    if(picture) {
      pxToEm(picture);
    }

  };

  // remove style attrs from font tags
  // added by fontSize -> px -> em conversion
  // so we can keep editing the font size even after enlarge
  var cleanFontTags = function(container) {
    var editors = container.querySelectorAll('[contenteditable]');
    var children;

    angular.forEach(editors, function(e) {
      children = e.querySelectorAll('*');
      angular.forEach(children, function(c) {
        // first turn font size=x to px
        if(c.tagName.toLowerCase() === 'font') {
          c.style = '';
        }
      });
    });

  };

  var newsletterSubscribe = function() {

    // track email
    var $content = $('.card-content');
    var emailAddress = $('.email p', $content).text().trim();

    data.NewsletterSubscribe({
      email: emailAddress
    });

  };

  // place business card on a canvas
  $scope.generatePicture = function() {

    var deferred = $q.defer();

    var $cardPreview = $('.card-preview').get(0);

    // remove text selection, to hide still-open editors
    window.getSelection().removeAllRanges();

    // before generation, turn all px values to em
    // for scaling
    // px generated by drag and editor
    fixPxSizes($cardPreview);

    model.generatingCard = true;

    html2canvas($cardPreview, {
      letterRendering: true,
      onrendered: function(canvas) {

        cleanFontTags($cardPreview);

        $timeout(function() {
          model.generatingCard = false;
        });

        deferred.resolve(canvas);

      }
    });

    return deferred.promise;

  };

  $scope.DownloadPdf = function() {

    model.generatingPdf = true;

    $scope.generatePicture().then(function(canvas) {
      model.generatingPdf = false;

      var doc = new jsPDF();

      var imgData = canvas.toDataURL('image/jpeg', 1.0);

      // full bleed size 3.75 x 2.25 (in) / 95.25 x 57.15 (mm)

      var width = 95.25,
        height = 57.15;

      // place images on page
      for(var i = 0; i < 2; i++) {
        for(var j = 0; j < 5; j++) {
          doc.addImage(imgData, 'JPEG', 4 + i * (width + 0.5), 4 + j * (height + 0.5), width, height);
        }
      }

      //doc.save(model.pdfFilename);

      // save using saveAs to work-around safari issues
      // https://github.com/MrRio/jsPDF/issues/303
      // https://github.com/MrRio/jsPDF/issues/196

      // saveAs is global from FileSaver.js
      // FileSaver is included in jsPdf
      saveAs(
        doc.output('blob'),
        model.pdfFilename
      );

    });

    // track pdf download
    ga('send', 'event', 'Download', 'Download PDF', model.activeTheme);

    // subscribe to newsletter
    newsletterSubscribe();

  };

  $scope.DownloadPicture = function() {

    $scope.generatePicture().then(function(canvas) {

      // make the canvas a blob, so we can download it with downloadify
      canvas.toBlob(
        function (blob) {

          // saveAs is global from FileSaver.js
          // FileSaver is included in jsPdf
          saveAs(blob, model.imageFilename);

          // scroll back to the card
          // since saveAs scrolls to the top
          var $cardContainer = $('.card-container');
          $cardContainer[0].scrollIntoView(true);

        },
        'image/jpeg'
      );

    });

    // track download
    ga('send', 'event', 'Download', 'Download picture', model.activeTheme);

    // subscribe to newsletter
    newsletterSubscribe();

  };

  model.openedModal = false;
  model.order = {};
  $scope.OpenOrderModal = function() {

    var $modalOrder = $('#modal-order');

    // check if any content is overflowing
    var $content = document.querySelector('.card-content');

    // round values for scrollw/h and clientw/h manually
    // because of
    // https://code.google.com/p/chromium/issues/detail?id=360889
    // summary:
    // chrome still doesn't return the exact float-point value for
    // scrollW/H

    // round everything UP
    var scrollWidth = Math.ceil($content.scrollWidth);
    var scrollHeight = Math.ceil($content.scrollHeight);

    var clientWidth = Math.ceil($content.clientWidth);
    var clientHeight = Math.ceil($content.clientHeight);

    // instead of just checking to see if the scroll area is larger
    // than the safe-zone,
    // we check if it's larger by more than 5 pixels
    // because browsers are crazy
    var widthOverflow = (Math.abs(scrollWidth - clientWidth) > 5);
    var heightOverflow = (Math.abs(scrollHeight - clientHeight) > 5);

    var isOverflowing = widthOverflow || heightOverflow;

    var overflowMessage = 'Oops! \n' +
    'Some of the details on your card will be cut during the printing process. \n\n' +
    'To make sure this doesn\'t happen, please try: \n' +
    '* Shortening some of text lines \n' +
    '* Moving the elements closer to the card center \n';

    if(isOverflowing) {

      window.alert(overflowMessage);

      // track analytics
      ga('send', 'event', 'Orders', 'Overflow error');

      return false;
    }

    // if this is the first time we're opening the modal,
    // copy the details to be used in the order form.
    // if the modal was previously opened, leave the details alone
    if(!model.openedModal) {

      model.order.email = $('.email p', $content).text().trim();
      model.order.name = $('.fn', $content).text().trim();
      model.order.phone = $('.tel', $content).text().trim();
      model.order.city = $('.locality', $content).text().trim();

      model.openedModal = true;
    }

    // generate image preview
    $scope.generatePicture().then(function(canvas) {

      // open the reveal modal
      $modalOrder.foundation('reveal', 'open');

      var jpegUrl = canvas.toDataURL('image/jpeg');
      model.imagePreview = jpegUrl;

    });

    // track analytics
    ga('send', 'event', 'Orders', 'Begin order');

  };

  $scope.$on('$includeContentLoaded', function() {

    // init foundation plugins
    $(document).foundation();

    // hack to prevent automatic scrolling from contenteditable
    var $cardContent = document.querySelector('.card-content');
    $cardContent.addEventListener('scroll', function(event) {
      $cardContent.scrollTop = 0;
      $cardContent.scrollLeft = 0;
    });

  });

  $(document).on('opened', '[data-reveal]', function () {
    // scroll to modal top when opened
    var modal = $(this);
    modal[0].scrollIntoView(true);
  });

  // trigger route update
  $scope.$broadcast('$routeUpdate');

});

(function Hangar() {
  "use strict";

  var VIEW = Navigation.VIEWS.HANGAR;

  var PIONEER_GUID = '54D0DFA14E57170E5CA88AA0B89AF409';

  var currentShownShipId;
  var campaigns;

  var elLoadout;
  var elFiringRange;
  var elShipGuide;
  var leaderboardDigest = null;

  var currentAnimationFrame = 0;
  var currentScroll = 0;
  var multiplierDecay = 0.92;
  var changePerFrame = .08;
  var scrollChange = 0;

  function init() {

    elLoadout = VIEW.el.querySelector('.button.loadout');
    elFiringRange = VIEW.el.querySelector('.button.firing-range');
    elShipGuide = VIEW.el.querySelector('.button.ship-guide');

    engine.on('UpdatePlayer', progressionLocks);

    ShipsList.init({
      'el': VIEW.el.querySelector('.ships .list ul'),
      'prevArrow': VIEW.el.querySelector('.ships .ship-arrow[data-dir="prev"]'),
      'nextArrow': VIEW.el.querySelector('.ships .ship-arrow[data-dir="next"]'),
      'onSelect': onSelectShipInList,
      'onRender': onShipsRendered,
      'onToggleFavourite': onToggleFavourite
    });

    ShipsFilters.init({
      'elButton': VIEW.el.querySelector('.ships .filters-button'),
      'el': VIEW.el.querySelector('.ships .filters')
    });

    SkinSelector.init({
      'el': VIEW.el.querySelector('.skins'),
      'elLocked': VIEW.el.querySelector('.locked-skin'),
      'onSelect': onSelectSkin,
      'onPurchase': onPurchaseSkin
    });

    ShipPurchase.init({
      'el': VIEW.el.querySelector('.purchase-ship'),
      'shipId': currentShownShipId
    });

    InfoTabs.init({
      'elTabs': VIEW.el.querySelector('.column.left ul.tabs')
    });

    CrewSelect.init({
      'el': VIEW.el.querySelector('.crew-select'),
      'elButton': VIEW.el.querySelector('.crew-select .button')
    });    

    PlayerXPRewards.init({
      'el': VIEW.el.querySelector('[data-bar-type="playerXP"]')
    });

    if (DataStore.campaignsProgress) {
      campaigns = new CampaignWidget({
        'elContainer': VIEW.el.querySelector('.view-hangar .live-ops-status.campaign-info')
      });
    } else {
      utils.on('CampaignDataReceived', setupCampaignWidget);
    }

    utils.on('Skin_Purchased', onSkinPurchased);

    DataStore.whenReady(function onShipsReady() {
      CrewDB.whenReady(function onCrewReady() {
        window.setTimeout(realInit, 0);
      });
    });

    ShipsList.el.addEventListener('mouseover', onShipsListMouseOver);
    ShipsList.el.addEventListener('mouseout', onShipsListMouseOut);

    leaderboardDigest = new LeaderboardDigest({
      'el': VIEW.el.querySelector(".leaderboard.main")
    });
    utils.on('ViewShown', onViewShown);
    utils.on('Bundle_Purchased', onBundlePurchased);

    utils.onClick(elLoadout, onClickLoadout);
    utils.onClick(elFiringRange, utils.loadFiringRange.bind(utils));
    utils.onClick(elShipGuide, onClickShipGuide);

    var elRightSidebar = VIEW.el.querySelector(".campaign-selector");
    utils.onClick(elRightSidebar, onClickRightSidebar);
    utils.onClick(VIEW.el.querySelector('.column.left .collapse'), onClickLeftCollapse);

    utils.l10n.load(VIEW.el);

    utils.l10n.whenReady(resizeNextMissionBanners);
  }

  function resizeNextMissionBanners() {
    let elCampaignList = VIEW.el.querySelector('.campaign-list');
    if (elCampaignList) {

      let elCountdownWrappers = elCampaignList.querySelectorAll('.countdown-wrapper') || [];
      elCountdownWrappers.forEach(el => {
        if (el.style.display === 'block') {
  
          let innerContainer = el.querySelector('.countdown-wrapper-inner');
          if (innerContainer) {
            utils.resizeFontToFit(innerContainer);
          }
        }
      });
    }
  }

  function progressionLocks() {
    elFiringRange.classList.add('locked');
    elLoadout.classList.remove('locked');
  }

  function setupCampaignWidget(){
      campaigns = new CampaignWidget({
        'elContainer': VIEW.el.querySelector('.view-hangar .live-ops-status.campaign-info')
      });
    utils.off('CampaignDataReceived', setupCampaignWidget);
  }

  function onClickLoadout() {
    var playerShip = DataStore.getShip(Player.getShip());

    if (playerShip) {
      try {
        utils.reportEvent(Config.ANALYTICS.LOADOUT_OPEN, {
          'shipName': playerShip.name,
          'shipGUID': playerShip.Id,
          'isShipOwned': Boolean(playerShip.owned),
          'uiEventType': Config.ANALYTICS.UI_EVENT_TYPES.NAVIGATION
        });
      } catch (e) {
        console.error("Error firing analytics");
      }

      Navigation.show(Navigation.VIEWS.LOADOUT, 'hangarButton', function onLoadoutReady() {
        window.setTimeout(function () {
          utils.dispatch('BuildShipLoadout', {
            'ship': playerShip
          });
        }, 100);
      });
    }
  }

  function onClickShipGuide(e) {
    let shipId = e.currentTarget.dataset.shipId;
    
    if (shipId) {

      let playerShip = DataStore.getShip(shipId);
      if (playerShip !== null) {

        let videoConfig = Config.VIDEO_IDS[shipId];
        if (videoConfig && videoConfig.VideoId) {
          engine.call('OpenURLViaOverlay', 'https://www.youtube.com/watch?v=' + videoConfig.VideoId);

          try {
            utils.reportEvent(Config.ANALYTICS.SHIP_GUIDE_OPEN, {
              'shipName': playerShip.name,
              'shipGUID': playerShip.Id,
              'isShipOwned': Boolean(playerShip.owned),
              'uiEventType': Config.ANALYTICS.UI_EVENT_TYPES.NAVIGATION
            });
          } catch (e) {
            console.error("Error firing analytics");
          }
        }
      }
    }    
  }

  function onClickRightSidebar(e){
    var button = e.target;

    if ( button.classList.contains("tab") ){
      e.currentTarget.querySelectorAll(".tab").forEach(function(tab){
        tab.classList.remove("active");
      });

      button.classList.add("active");
      e.currentTarget.parentNode.classList.add("expanded");
      e.currentTarget.parentNode.classList.remove("campaigns");
      e.currentTarget.parentNode.classList.remove("leaderboards");
      e.currentTarget.parentNode.classList.add(button.dataset.tabId);
    } else if ( button.classList.contains("expand-toggle") ){
      e.currentTarget.parentNode.classList.toggle("expanded");
      if ( !e.currentTarget.parentNode.classList.contains("leaderboards") && !e.currentTarget.parentNode.classList.contains("campaigns")){
        e.currentTarget.parentNode.classList.add("campaigns");
        e.currentTarget.querySelector("[data-tab-id='campaigns']").classList.add("active");
      }
    }
  }

  function onClickLeftCollapse() {
    var elLeftSidebar = VIEW.el.querySelector('.column.left');

    if (elLeftSidebar.classList.contains('collapsed')) {
      elLeftSidebar.classList.remove('collapsed');
    } else {
      elLeftSidebar.classList.add('collapsed');
    }
  }

  function onViewShown(data) {
    if (data.view.id === VIEW.id && ['', 'GO_TO_GAMEMODES'].indexOf(Player.FtueStep) > -1) {
      document.addEventListener('keyup', onKeyPress);
      var cl = VIEW.el.querySelector(".campaign-widget");
      if (cl){
        cl.addEventListener('mousewheel', function(e){
          e.stopImmediatePropagation();
        });
      }
      document.addEventListener('mousewheel', scrollShipsList);
    } else {
      document.removeEventListener('keyup', onKeyPress);
      document.removeEventListener('mousewheel', scrollShipsList);
    }
  }

  function onBundlePurchased(data) {
    var bundle = data.bundle;
    if (bundle && Navigation.isVisible(VIEW)) {
      SkinSelector.skinsList.refresh();
    }
  }

  function realInit() {

    utils.on('ShipSelected', onPlayerShipChanged);

    onPlayerShipChanged();
    SkinSelector.render();
    ShipPurchase.render();

    utils.on('ShipsUpdated', onShipsUpdated);
    onShipsUpdated();

    utils.on('ShipLoadoutUpdated', SkinSelector.render.bind(SkinSelector));
    utils.on('ShipLoadoutUpdated', ShipPurchase.render.bind(ShipPurchase));
  }

  function onSkinPurchased() {
    SkinSelector.refresh();
  }

  function onKeyPress(e) {
    if (!ShipsList.isMoving) {
      if (e.keyCode === 37) {
        ShipsList.prev();
      } else if (e.keyCode === 39) {
        ShipsList.next(true);
      }
    }
  }

  function scrollShipsList(e) {
    var INCREMENT_BY = 40;
    var frameNumber = 0;

    ShipsList.swContainer.classList.remove('visible');

    if (e && e.target) {
      if (!ShipsList.el.querySelector('.selected') || e.target.classList.contains('ship-flavour-text')) {
        return;
      }

      if (e.deltaY < 0) {
        currentScroll += INCREMENT_BY;
      } else {
        currentScroll += -INCREMENT_BY;
      }

      currentAnimationFrame++;
      frameNumber = currentAnimationFrame;
    } else {
      if (e !== currentAnimationFrame) {
        return;
      }
      frameNumber = e;
      if (!ShipsList.continueScrolling) {
        scrollChange = currentScroll - (currentScroll * multiplierDecay);

        if (scrollChange > INCREMENT_BY * changePerFrame) {
          scrollChange = INCREMENT_BY * changePerFrame;
        } else if (scrollChange < -(INCREMENT_BY * changePerFrame)) {
          scrollChange = -(INCREMENT_BY * changePerFrame);
        }
        currentScroll -= scrollChange;
      }
    }

    var currentLeft = parseFloat(window.getComputedStyle(ShipsList.el).left);

    currentLeft += currentScroll;

    if (currentLeft > 0) {
      currentScroll = currentLeft = 0;
    } else {
      if (currentLeft < -(ShipsList.el.scrollWidth - ShipsList.el.clientWidth)) {
        currentLeft = -(ShipsList.el.scrollWidth - ShipsList.el.clientWidth);
        currentScroll = 0;
      }
    }

    ShipsList.el.style.left = currentLeft + 'px';

    ShipsList.showHideArrows();

    if (Math.abs(currentScroll) > 5) {
      requestAnimationFrame(scrollShipsList.bind(this, frameNumber));
    }

  }

  function onShipsListMouseOver(e) {
    var shipId = e.target.dataset.id;
    if (shipId) {
      var ship = DataStore.getShip(shipId);
      if (ship) {
        showShipInfo(ship);
      }
    }
  }

  function onShipsListMouseOut(e) {
    var el = e.toElement;
    while (el) {
      if (el.tagName === 'LI') {
        return;
      }

      el = el.parentNode;
    }

    var playerShip = DataStore.getShip(Player.getShip());

    if (playerShip) {
      showShipInfo(playerShip);
    }
  }

  function onPlayerShipChanged() {
    if (!Navigation.isVisible(VIEW)) {
      VIEW.el.style.opacity = 0;
      VIEW.el.style.display = 'block';
    }

    var playerShip = DataStore.getShip(Player.getShip());

    if (playerShip) {
      var manufacturer = DataStore.getManufacturer(playerShip.manufacturerId);

      utils.updateScope({
        'playerShip': playerShip,
        'playerShipStats': playerShip.stats,
        'playerShipManufacturer': manufacturer
      }, VIEW);

      generateBars();

      switchShipName(playerShip);

      showShipInfo(playerShip, true);

      if (ShipsList.contains(playerShip) && ShipsList.current.Id !== playerShip.Id) {
        ShipsList.select(playerShip.Id);
      }

      ShipPurchase.render({
        shipId: playerShip.Id
      });
    }

    if (!Navigation.isVisible(VIEW)) {
      VIEW.el.style.opacity = '';
      VIEW.el.style.display = 'none';
    }
  }

  function showShipInfo(ship, bForce) {
    if (ship.Id === currentShownShipId && !bForce) {
      return;
    }

    currentShownShipId = ship.Id;

    var playerShip = DataStore.getShip(Player.getShip());
    var manufacturer = DataStore.getManufacturer(ship.manufacturerId);
    var isSelectedShip = playerShip.Id === ship.Id;
    let shipDifficultyTooltip = getShipDifficultyTooltip(ship.difficulty);

    utils.updateScope({
      'isOwnShip': isSelectedShip,
      'selectedShip': ship,
      'selectedShipStats': ship.stats,
      'selectedShipManufacturer': manufacturer,
      'difficultyTooltip': utils.l10n.get(shipDifficultyTooltip)
    }, VIEW);

    generateBars();

    var statsDifference = {};
    if (isSelectedShip) {
      for (var k in playerShip.stats) {
        statsDifference[k] = {
          'value': '',
          'sign': ''
        };
      }
    } else {
      for (var k in playerShip.stats) {
        var playerShipStat = playerShip.stats[k].value;
        var otherShipStat = ship.stats[k].value;

        statsDifference[k] = {
          'value': Math.abs(otherShipStat - playerShipStat),
          'sign': otherShipStat > playerShipStat ? 'pos' : otherShipStat < playerShipStat ? 'neg' : 'same'
        };
      }
    }

    utils.updateScope({
      'statsDifference': statsDifference
    }, VIEW);
  }

  function getShipDifficultyTooltip(difficulty) {
    let l10nString = '';

    if (difficulty === 0) {
      l10nString = 'HangarTooltipDifficulty0';
    } else if (difficulty === 1) {
      l10nString = 'HangarTooltipDifficulty1';
    } else if (difficulty === 2) {
      l10nString = 'HangarTooltipDifficulty2';
    } else {
      l10nString = 'HangarTooltipDifficulty3';
    }

    return l10nString;
  }

  function generateBars() {
    var elBars = VIEW.el.querySelectorAll(".bar");
    var elBar, barType, container, progress, barNum, barVal,
      comparisonBar, comparisonProgress, compBarNum, compValue;
    for (var i = 0, len = elBars.length; i < len; i++) {
      elBar = elBars[i];
      barType = elBar.dataset.barType;
      if (elBar.dataset.populated !== "true") {
        //TODO: Replace this with documentfragment when coherent supports it
        var imgDiv = document.createElement("div");
        imgDiv.classList.add("bar-img");
        var img = document.createElement("img");
        img.setAttribute("src", "images/ship-icons/" + barType + "-white.png");
        imgDiv.appendChild(img);
        elBar.appendChild(imgDiv);

        container = document.createElement("div");
        container.classList.add("bar-container");
        progress = document.createElement("div");
        progress.innerHTML = document.getElementById("progress-svg").innerHTML;
        progress.classList.add("progress");
        container.appendChild(progress);

        if (elBar.dataset.showCompare) {
          comparisonBar = document.createElement("div");
          comparisonBar.classList.add("comparison-bar");
          comparisonProgress = document.createElement("div");
          comparisonProgress.classList.add("progress");
          comparisonBar.appendChild(comparisonProgress);

          compBarNum = document.createElement("div");
          compBarNum.classList.add("bar-num");
          compValue = document.createElement("span");
          compValue.classList.add("comp-value");
          compBarNum.appendChild(compValue);
          comparisonBar.appendChild(compBarNum);
          container.appendChild(comparisonBar);
        }
        elBar.appendChild(container);

        barNum = document.createElement("div");
        barNum.classList.add("bar-num");
        barVal = document.createElement("span");
        barVal.classList.add("bar-value");
        barNum.appendChild(barVal);
        elBar.appendChild(barNum);

        elBar.dataset.populated = true;
      } else {
        container = elBar.querySelector(".bar-container");
        progress = elBar.querySelector(".progress");
        barVal = elBar.querySelector(".bar-value");
        if (elBar.dataset.showCompare) {
          comparisonBar = elBar.querySelector(".comparison-bar");
          compValue = comparisonBar.querySelector(".comp-value");
          comparisonProgress = comparisonBar.querySelector(".progress");
        }
      }
      progress.querySelector(".progress-bar").style.transform = "scale(" + elBar.dataset.level * 0.01+ ",1)";
      progress.querySelector(".progress-bar").style.fill = elBar.dataset.color;
      barVal.textContent = elBar.dataset.level;

      if (comparisonBar) {
        if (elBar.dataset.isOwnShip === "false") {
          document.querySelector(".compare-icon").style.display = "block";
          document.querySelector(".compare-ship-name").style.display = "block";
          comparisonBar.style.display = "block";
          comparisonProgress.style.width = elBar.dataset.compareLevel + "%";
          comparisonProgress.style.backgroundColor = elBar.dataset.color;
          compValue.textContent = elBar.dataset.compareLevel;
        } else {
          comparisonBar.style.display = "none";
          document.querySelector(".compare-icon").style.display = "none";
          document.querySelector(".compare-ship-name").style.display = "none";
        }
      }
    }
  }

  function switchShipName(playerShip) {
    var elShipName = VIEW.el.querySelector('.selected-ship .ship-name');
    var elManuImage = VIEW.el.querySelector('.selected-ship .manufacturer-image');

    elShipName.addEventListener('webkitTransitionEnd', function onTransitionEnd(e) {
      e.target.removeEventListener('webkitTransitionEnd', onTransitionEnd);
      utils.updateScope({
        'shipTitle': {
          'shipName': playerShip.name,
          'manuImage': 'images/manufacturers/' + playerShip.manufacturerId + '/tree.png'
        }
      }, VIEW);
      e.target.classList.remove('fadeDown');
      elManuImage.classList.remove('fadeDown');
    }.bind(elManuImage));

    elShipName.classList.toggle('fadeDown');
    elManuImage.classList.toggle('fadeDown');
  }

  function onShipsUpdated() {
    var ships = DataStore.query({
      'types': 'ships',
      'where': {
        'owned': true,
        'available': true
      },
      'order': {
        'owned': 'FTUEFlow' in window && FTUEFlow.isVisible ? 'desc' : 'asc',
        'name': 'asc'
      }
    });

    if (ships.length === 0) {
      VIEW.el.classList.add('no-ships');
    } else {
      VIEW.el.classList.remove('no-ships');
    }

    showSelectedFilterShips();
  }

  function onSelectShipInList(shipId) {
    if (Player.selectShip(shipId)) {
      utils.reportEvent(Config.ANALYTICS.CHANGE_SHIP, {
        'shipGUID': shipId
      });
    }
  }

  function updateShipVideoButton(shipId) {
    // Dispatch Ship ID to header-script file to update ship video data attribute
    var elShipGuide = VIEW.el.querySelector('.button.ship-guide');
    if (Config.VIDEO_IDS[shipId] && Config.VIDEO_IDS[shipId].VideoId !== '') {
      if (elShipGuide.classList.contains('locked')) {
        elShipGuide.classList.remove('locked');
        elShipGuide.dataset.tooltip = "l10n(ButtonShipGuideTooltip)";
      }
      elShipGuide.dataset.shipId = shipId;
    } else {
      if (!elShipGuide.classList.contains('locked')) {
        elShipGuide.classList.add('locked');
        elShipGuide.dataset.tooltip = "l10n(ButtonShipGuideComingSoonTooltip)";
      }
    }
  }

  function showSelectedFilterShips() {
    var queryParams = ShipsFilters.createQueryParams();

    // All the time through FTUE, set Favourites as the filter
    if ('FTUEFlow' in window && FTUEFlow.isVisible) {
      // TODO: Fix this so that it only shows favourite ships during FTUE
      // ShipsTabs.select(FILTER_FAVOURITES);
    }

    // if (ShipsTabs.current === FILTER_FAVOURITES) {
    //   queryParams.where.isFavourite = true;
    // } else if (ShipsTabs.current === 'owned') {
    //   queryParams.where.owned = true;
    // }

    ShipsList.load(DataStore.query(queryParams));
  }

  function onToggleFavourite(ship) {
    ship = DataStore.getShip(ship);
    if (!ship) {
      return;
    }

    var el = ShipsList.el.querySelector('[data-id="' + ship.Id + '"]');

    if (el.classList.contains('favourite-true')) {
      el.classList.remove('favourite-true');
      el.classList.add('favourite-false');
    } else {
      el.classList.remove('favourite-false');
      el.classList.add('favourite-true');
    }

    DataStore.setFavourite(ship, !DataStore.isFavourite(ship));
  }

  function onShipsRendered() {
    var ship = Player.getShip();
    var shipInList = false;

    // Check if ship is visible in the ships list
    var list = ShipsList.el.querySelectorAll('li.ship');
    for (var i = 0; i < list.length; i++) {
      var el = list[i];
      if (el.dataset.id === ship) {
        shipInList = true;
        break;
      }
    }

    if (!shipInList) {
      var ship = ShipsList.el.querySelector('li.ship') ? ShipsList.el.querySelector('li.ship').dataset.id : false;
      shipInList = ship ? true : false;
      if (shipInList) {
        Player.selectedShip = ship;
        ShipsList.el.style.transition = 'none';
        ShipsList.el.style.left = '0px';
        void ShipsList.offsetWidth;
        ShipsList.el.style.transition = null;
      }
    }

    if (shipInList) {
      ShipsList.select(ship, true);
    }


  }

  function onSelectSkin(skin) {
    Tooltip.hide();
    Player.selectSkin(skin.Id);
  }

  function onPurchaseSkin(skin) {
    Navigation.show(Navigation.VIEWS.SKIN_PREVIEW, function onShow() {
      utils.dispatch('Show_Skin', {
        'id': skin.Id
      });
    });
  }

  var ShipsList = (function ShipsList() {
    var TEMPLATE_SHIP = '<li data-id="{{Id}}" data-audio-hover data-audio-click="UI_SelectMenuItem" class="ship favourite-{{isFavourite}} owned-{{owned}} free-rotation-{{freeRotation}} cursor-over" data-position="{{position}}" data-tooltip data-tooltip-align="top">' +
      '<div class="image" style="background-image: url({{images.hangar}});"></div>' +
      '<div class="manufacturer-image" style="background-image: url({{manufacturerImage}})"></div>' +
      '<span class="icon" data-tooltip="{{l10nIconString}}" data-tooltip-align="above center" style="background-image: url({{images.hangarIcon}});"></span>' +
      '<span class="free-rotation"><span class="text">' + utils.l10n.get('FreeRotation') + '</span><span class="bg"></span></span>' +
      '<span class="name">' +
        '<span class="strong-against" data-tooltip-content="{{strongAgainstContent}}"></span>' +
        '<span>{{name}}</span>' +
        '<span class="weak-against" data-tooltip-content="{{weakAgainstContent}}"></span>' +
      '</span>' +
      '<div class="prices">' +
      '<div class="unowned">' +
      '<div class="price sc" data-sc-price="{{(f)price}}">' +
      '<span>{{(f)price}}</span>' +
      '<b></b>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '<b class="locked" data-tooltip="l10n(HangarLockedTooltip)" data-tooltip-align="above center"></b>' +
      '<div class="selected-state"></div>' +
      '</li>';

    var TEMPLATE_STRONG_WEAK_CONTAINER = '<div class="strong-weak-title">{{title}}</div>' +
                                 '<div class="strong-weak-names-counters">' +
                                 '<div class="names">{{names}}</div>' +
                                 '<div class="counters">{{counters}}</div>' +
                                 '</div>';

    var TEMPLATE_STRONG_WEAK_NAMES = '<span>{{name}}</span>';

    var TEMPLATE_STRONG_WEAK_COUNTERS = '<div data-rating="{{rating}}">' + 
                                          '<span></span>' +
                                          '<span></span>' +
                                          '<span></span>' +
                                          '<span></span>' +
                                          '<span></span>' +
                                        '</div>';

    function ShipsList() {
      this.el;
      this.prevArrow;
      this.nextArrow;
      this.swContainer;

      this.scrollPos = 0;
      this.current;

      this.onSelect;
      this.onRender;
      this.onToggleFavourite;

      this.AMOUNT_TO_SCROLL_BY = 3;

      this.ships = [];
    }

    ShipsList.prototype.init = function init(options) {
      this.el = options.el;
      this.prevArrow = options.prevArrow;
      this.nextArrow = options.nextArrow;

      utils.onClick(this.el, this.onClick.bind(this));

      this.prevArrow.addEventListener('mousedown', this.onMouseDownArrow.bind(this), false);
      this.nextArrow.addEventListener('mousedown', this.onMouseDownArrow.bind(this), false);
      this.prevArrow.addEventListener('mouseup', this.onMouseUpArrow.bind(this), false);
      this.nextArrow.addEventListener('mouseup', this.onMouseUpArrow.bind(this), false);
      this.swContainer = VIEW.el.parentNode.querySelector('.sw-container');

      this.onSelect = options.onSelect || function () { };
      this.onRender = options.onRender || function () { };
      this.onToggleFavourite = options.onToggleFavourite || function () { };
    };

    ShipsList.prototype.contains = function contains(shipToCheck) {
      for (var i = 0, len = this.ships.length, ship; i < len; i++) {
        ship = this.ships[i];

        if (ship && ship.Id === shipToCheck.Id) {
          return true;
        }
      }

      return false;
    };

    ShipsList.prototype.prev = function prev() {
      var index = this.ships.indexOf(this.current) - 1;
      if (index >= 0) {
        var id = this.ships[index].Id;

        this.select(id);
        this.onSelect(id);
      }
    };

    ShipsList.prototype.next = function next(alignRight) {
      var index = this.ships.indexOf(this.current) + 1;
      if (index <= this.ships.length - 1) {
        var id = this.ships[index].Id;

        this.select(id, alignRight);
        this.onSelect(id);
      }
    };

    ShipsList.prototype.select = function select(id, alignRight) {
      var ship;
      for (var i = 0, len = this.ships.length; i < len; i++) {
        var fShip = this.ships[i];
        if (fShip && fShip.Id === id) {
          ship = fShip;
          break;
        }
      }

      if (!ship && !Player.selectedShip) {
        return false;
      } else if (!ship) {
        ship = DataStore.getShip(Player.selectedShip);
      }

      var elCurrent = this.el.querySelector('.selected[data-id]');
      var elNew = this.el.querySelector('[data-id = "' + id + '"]');

      this.current = ship;

      elCurrent && elCurrent.classList.remove('selected');
      elNew && elNew.classList.add('selected');
      VIEW.el.classList.remove('ship-owned', 'ship-unowned');

      if (ship.owned) {
        VIEW.el.classList.add('ship-owned');
      } else {
        VIEW.el.classList.add('ship-unowned');
      }


      utils.dispatch('HangarShipSelected', this.current);

      if (this.current.owned) {} else {
        SkinSelector.hideLockedMessage();
      }

      // Scroll to item if it's out of view
      if (elNew) {
        var itemBCR = elNew.getBoundingClientRect();
        var listBCR = this.el.parentNode.getBoundingClientRect();

        if ((itemBCR.left < listBCR.left || itemBCR.right > listBCR.right)) {
          this.scrollToItem(elNew, alignRight);
        }
      }

      this.showHideArrows();

      updateShipVideoButton(this.current.Id);

      return true;
    };

    ShipsList.prototype.showHideArrows = function showHideArrows() {
      if (this.el.scrollWidth > this.el.offsetWidth) {
        if (!this.el.style.left || parseFloat(window.getComputedStyle(this.el).left.trim()) >= 0) {

          if (this.prevArrow.classList.contains('mousedown')) {
            this.continueScrolling = false;
            this.prevArrow.classList.remove('mousedown');
          }

          this.prevArrow.classList.remove('visible');
        } else {
          if (!this.prevArrow.classList.contains('visible')) {
            this.prevArrow.classList.add('visible');
          }
        }

        var left = this.el.style.left ? -parseFloat(window.getComputedStyle(this.el).left.trim()) : 0;

        if (left && left + this.el.offsetWidth >= this.el.scrollWidth) {

          if (this.nextArrow.classList.contains('mousedown')) {
            this.continueScrolling = false;
            this.nextArrow.classList.remove('mousedown');
          }

          this.nextArrow.classList.remove('visible');
        } else {
          if (!this.nextArrow.classList.contains('visible')) {
            this.nextArrow.classList.add('visible');
          }
        }
      } else {
        this.prevArrow.classList.remove('visible');
        this.nextArrow.classList.remove('visible');
      }
    };

    ShipsList.prototype.load = function load(ships) {
      !ships && (ships = []);

      utils.updateScope({
        'numberOfShips': ships.length
      }, VIEW);

      if ('FTUEFlow' in window && FTUEFlow.isVisible) {

        // Push the Pioneer to the 
        ships.push(DataStore.ships[PIONEER_GUID]);

        // Get all ships that have free rotation
        var queryParams = DataStore.query({
          'types': 'ships',
          'where': {
            'freeRotation': true,
            'superlock': false
          }
        });

        // Merge the ships array with the new queryParams array
        ships = ships.concat(queryParams);

        // Go through the new ships array and remove any duplicate ships
        ships = ships.filter(function (item, pos) {
          return ships.indexOf(item) === pos;
        });

        ships.sort(function (a, b) {

          if ((a.freeRotation && b.freeRotation) || (!a.freeRotation && !b.freeRotation)) {
            return a.name > b.name ? 1 : -1;
          } else if (a.freeRotation && !b.freeRotation) {
            return -1;
          } else if (!a.freeRotation && b.freeRotation) {
            return 1;
          }

          return 0;
        });

      }

      this.ships = ships;

      this.render();
    };

    ShipsList.prototype.onClick = function onClick(e) {
      var elClicked = e.target;
      var data = elClicked.dataset || {};
      var id = data.id;
      var favourite = data.favourite;

      if (favourite) {
        this.onToggleFavourite(favourite);
      } else if (id) {
        this.onSelect(id);
      }
    };

    ShipsList.prototype.render = function render() {
      let html = '';
      let ships = this.ships.slice(0);

      for (let i = 0; i < ships.length; i++) {
        let ship = ships[i];
        let manuImage = DataStore.getManufacturer(ship.manufacturerId).images.tree;
        let strongAgainst = this.strongWeakTemplate(ship.Id, 0);
        let weakAgainst = this.strongWeakTemplate(ship.Id, 1);
        let l10nIconString = this.getIconType(ship);

        html += TEMPLATE_SHIP.format(ship).format({
          'isFavourite': DataStore.isFavourite(ship),
          'manufacturerImage': manuImage,
          'position': i,
          'strongAgainstContent': strongAgainst,
          'weakAgainstContent': weakAgainst,
          'l10nIconString': 'l10n(' + l10nIconString + ')'
        });
      }

      this.el.innerHTML = html;

      this.onRender();

      this.bindStrongWeak();

      this.selectedShipCheck();
    };

    ShipsList.prototype.selectedShipCheck = function selectedShipCheck() {
      for(let i = 0; i < this.ships.length; i++) {
        let ship = this.ships[0];
        if (this.current.Id === ship.Id) {
          Player.setShip(this.ships[0].Id);
          break;
        }
      }
    }
    
    ShipsList.prototype.getIconType = function getIconType(ship) {
      let l10nString = '';

      if (ship.role === 0) {
        l10nString = 'GenericLabelAttack';
      } else if (ship.role === 1) {
        l10nString = 'GenericLabelStealth';
      } else if (ship.role === 2) {
        l10nString = 'GenericLabelSniper';
      } else if (ship.role === 3) {
        l10nString = 'GenericLabelSupport';
      }

      return l10nString;
    }

    ShipsList.prototype.scrollToItem = function scrollToitem(el, alignRight) {
      var newLeft = 0;

      var containerWidth = this.el.offsetWidth;
      var width = el.offsetWidth;
      var margin = parseInt(window.getComputedStyle(this.el.querySelector('.ship')).marginRight);
      var scrollPadding = margin * 2;
      var position = parseInt(el.dataset.position);

      if (alignRight) {
        newLeft = -((position + 1) * (width + margin)) + containerWidth - scrollPadding;
      } else {
        newLeft = ((width + margin) * -position) + scrollPadding;
      }

      if (newLeft < -(this.el.scrollWidth - containerWidth)) {
        newLeft = -(this.el.scrollWidth - containerWidth);
      }

      if (newLeft > 0) {
        newLeft = 0;
      }
      
      this.el.style.transition = 'none';
      this.el.style.left = newLeft + 'px';
      void this.el.offsetWidth;
      this.el.style.transition = null;
    };

    ShipsList.prototype.onMouseDownArrow = function onMouseDownArrow(e) {
      if (!e.target.classList.contains('ship-arrow')) {
        return;
      }

      e.target.classList.add('mousedown');

      this.continueScrolling = true;

      if (e.target.dataset.dir === 'next') {
        scrollShipsList({
          'deltaY': 100,
          'target': this.nextArrow
        });
      } else {
        scrollShipsList({
          'deltaY': -100,
          'target': this.prevArrow
        });
      }
    };

    ShipsList.prototype.onMouseUpArrow = function onMouseUpArrow(e) {

      e.target.classList.remove('mousedown');


      this.continueScrolling = false;
    };

    ShipsList.prototype.strongWeakTemplate = function strongWeakTemplate(id, counterId) {
      if (!id) {
        return false;
      }

      var title = utils.l10n.get('Hangar' + (counterId === 0 ? 'Strong' : 'Weak') + 'AgainstTitle');
      var strongWeakArray = DataStore['get' + (counterId === 0 ? 'Strong': 'Weak') + 'AgainstShip'](id);
      var namesHtml = '';
      var countersHtml = '';

      if (!strongWeakArray || !strongWeakArray.length) {
        return '';
      }

      for (var i = 0; i < strongWeakArray.length; i++) {
        var item = strongWeakArray[i];
        var name = DataStore.getShip(item.guid).name;
        var rating = item.rating;

        namesHtml += TEMPLATE_STRONG_WEAK_NAMES.format({
          'name': name
        }, false);
        countersHtml += TEMPLATE_STRONG_WEAK_COUNTERS.format({
          'rating': rating
        }, false);
      }

      return TEMPLATE_STRONG_WEAK_CONTAINER.format({
        'title': title,
        'names': namesHtml,
        'counters': countersHtml
      }, false);
    };

    ShipsList.prototype.bindStrongWeak = function bindStrongWeak() {
      var elShips = this.el.querySelectorAll('li');

      for(var i = 0; i < elShips.length; i++) {
        var el = elShips[i];
        var strongAgainst = el.querySelector('.strong-against');
        var weakAgainst = el.querySelector('.weak-against');

        strongAgainst.addEventListener('mouseover', this.onHoverCounters.bind(this, el));
        strongAgainst.addEventListener('mouseout', this.onHoverOut.bind(this, el));
        weakAgainst.addEventListener('mouseover', this.onHoverCounters.bind(this, el));
        weakAgainst.addEventListener('mouseout', this.onHoverOut.bind(this, el));
      }
    };

    ShipsList.prototype.onHoverCounters = function onHoverCounters(parentEl, e) {
      var elBCR = parentEl.getBoundingClientRect();

      var width = elBCR.width + 'px; ';
      var horPos = elBCR.left + 'px; ';

      this.swContainer.setAttribute('style', 'width: ' + width + 'left: ' + horPos);
      this.swContainer.innerHTML = e.target.dataset.tooltipContent;
      this.swContainer.classList.add('visible');
    };

    ShipsList.prototype.onHoverOut = function onHoverOut() {
      this.swContainer.classList.remove('visible');
    };

    return new ShipsList();
  }());

  var ShipsFilters = (function ShipsFilters() {

    function ShipsFilters() {

      this.elButton;
      this.el;
      this.options;
      this.isVisible = false;

      this.shipTypeFilters = {
        'attack': false,
        'heavy': false,
        'healer': false,
        'specialist': false
      };

      this.manuFilters = 'all';
      this.ownershipFilter = 'all';

      ShipsFilters.prototype.init = function init(options) {
        this.el = options.el;
        this.elButton = options.elButton;

        utils.onClick(this.elButton, this.onClickFiltersButton.bind(this));
        utils.onClick(this.el, this.onClick.bind(this));
      };

      ShipsFilters.prototype.onClickFiltersButton = function onClickFiltersButton() {
        switch (this.isVisible) {
          case true:
            this.hideFilters();
            break;
          case false:
          default:
            this.showFilters();
            break;
        }
      };

      ShipsFilters.prototype.onClick = function onClick(e) {
        var elClicked = e.target;
        if (!elClicked.dataset.hasOwnProperty('value')) {
          return;
        }

        // Must be a key related to a ships property
        var key = elClicked.dataset.key;

        // Get the type of button you've clicked
        var elGroup = utils.findAncestor(elClicked, 'group');
        var inputType = elGroup && elGroup.dataset.optionType ? elGroup.dataset.optionType : 'checkbox';

        // Should most of the time be a boolean, but can be anything
        var value = elClicked.dataset.value;

        if (inputType === 'radio' && elClicked.classList.contains('checked')) {
          return;
        }

        if (value !== '') {
          switch (key) {
            case 'shipType':
              this.shipTypeFilters[value] = !this.shipTypeFilters[value];
              break;
            case 'manufacturerId':
              this.manuFilters = value;
              break;
            case 'ownership':
              this.ownershipFilter = value;
              break;
            default:
              return false;
          }
        }

        if (inputType === 'radio') {
          elGroup.querySelectorAll('.checked').forEach(function (el) {
            el.classList.remove('checked');
          });
        }

        elClicked.classList.toggle('checked');

        var query = this.createQueryParams();
        ShipsList.load(DataStore.query(query));
      };
    };

    ShipsFilters.prototype.createQueryParams = function createQueryParams() {
      var queryParams = {
        'types': 'ships',
        'where': {
          'superlock': false
        },
        'order': {
          'name': 'asc'
        }
      };

      var shipTypeFilters = [];
      for (var key in this.shipTypeFilters) {
        if (this.shipTypeFilters[key]) {
          shipTypeFilters.push(key);
        }
      }

      switch (this.manuFilters) {
        case 'M00':
        case 'M01':
        case 'M02':
          queryParams.where.manufacturerId = this.manuFilters;
          break;
        case 'all':
        default:
          delete queryParams.where.manufacturerId;
          break;
      }

      switch (this.ownershipFilter) {
        case 'owned':
          queryParams.where.owned = true;
          delete queryParams.where.freeRotation;
          break;
        case 'unowned':
          queryParams.where.owned = false;
          delete queryParams.where.freeRotation;
          break;
        case 'freeRotation':
          queryParams.where.freeRotation = true;
          delete queryParams.where.owned;
          break;
        case 'all':
        default:
          delete queryParams.where.owned;
          delete queryParams.where.freeRotation;
          break;
      }

      if (shipTypeFilters.length) {
        queryParams.where.shipType = shipTypeFilters;
      }

      this.currentQuery = queryParams;

      return queryParams;
    };

    ShipsFilters.prototype.getQueryParams = function getQueryParams() {
      return this.currentQuery;
    };

    ShipsFilters.prototype.hideFilters = function hideFilters() {
      this.elButton.classList.remove('active');
      this.el.classList.remove('visible');
      this.isVisible = false;
    };

    ShipsFilters.prototype.showFilters = function showFilters() {
      this.elButton.classList.add('active');
      this.el.classList.add('visible');
      this.isVisible = true;
    };

    return new ShipsFilters();
  }());

  var SkinSelector = (function SkinSelector() {
    var TEMPLATE_SKIN_LIST_ITEM = '<li class="cursor-over" data-id="{{Id}}" data-tooltip="{{tooltip}}" data-tooltip-align="bottom center" data-skin-type="{{skinType}}">' +
      '<div class="image" style="background-image: url({{skinIcon}});">' +
      '<div class="skin-image-mask" style="-webkit-mask-image: url({{skinIcon}});"></div>' +
      '</div>' +
      '</li>';

    function SkinSelector() {
      this.el;
      this.elLocked;

      this.currentSkin;
      this.currentIndex = 0;

      this.onSelect;
      this.onPurchase;

      this.isFirstTime;

      this.skinsList;
    }

    SkinSelector.prototype.init = function init(options) {
      this.el = options.el;
      this.elLocked = options.elLocked;

      utils.onClick(this.elLocked.querySelector('.purchase'), this.onClickPurchase.bind(this));

      this.onSelect = options.onSelect || function () { };
      this.onPurchase = options.onPurchase || function () { };

      this.skinsList = new SkinsList({
        'el': this.el.querySelector('.horizontal-list'),
        'onSelect': this.onSelectSkinInList.bind(this),
        'getItem': DataStore.getSkin.bind(DataStore),
        'getItems': this.getShipSkins.bind(this),
        'renderItem': this.renderSkin
      });
      
      utils.on(DataStore.EVENTS.UPDATE_PARTS, this.skinsList.refresh.bind(this.skinsList));
    };

    SkinSelector.prototype.onClickPurchase = function onClickPurchase() {
      this.onPurchase(this.currentSkin);
    };

    SkinSelector.prototype.renderSkin = function renderSkin(item) {
      var tooltip = item.name;
      if (item.skinType) {
        if (item.skinType === 4) {
          tooltip += ' - <highlight>' + utils.l10n.get('GenericLabelRarityLegendary') + '</highlight>';
        } else if (item.skinType === 6) {
          tooltip += ' - <span class="defense-color">' + utils.l10n.get('SkinsListUltimate') + '</span>';
        }
      }
      return TEMPLATE_SKIN_LIST_ITEM.format({
        'skinType': item.skinType || '',
        'tooltip': tooltip,
        'skinIcon': item.skinIcon
      }).format(item);
    };

    SkinSelector.prototype.refresh = function refresh() {
      var skin = DataStore.getSkin(this.currentSkin);
      this.onSelectSkinInList(skin, this.skinsList.currentIndex);
    };

    SkinSelector.prototype.onSelectSkinInList = function onSelectSkinInList(skin, index) {
      utils.updateScope({
        'selectedSkinIndex': this.skinsList.currentIndex + 1
      }, VIEW);

      var currentShip = Player.selectedShip;
      var ownsCurrentShip = DataStore.getShip(currentShip).owned;

      if (skin) {
        if (skin.owned) {
          this.hideLockedMessage();
        } else if (ownsCurrentShip) {
          this.showLockedMessage(skin);
        }

        if (!this.isFirstTime) {
          var playerShip = DataStore.getShip(Player.getShip()) || {};
          utils.reportEvent(Config.ANALYTICS.HANGAR_SKIN_SELECT, {
            'shipGUID': playerShip.Id || '',
            'skinGuid': skin.Id || '',
            'isOwned': skin.owned,
            'numberOfSkins': this.skinsList.numberOfItems()
          });

          this.onSelect(skin, index);
        }
      }

      this.isFirstTime = false;

      this.currentSkin = skin;
    };

    SkinSelector.prototype.getShipSkins = function getShipSkins() {
      var skins = {};
      var playerShip = DataStore.getShip(Player.getShip());

      if (!playerShip) {
        return skins;
      }

      var shipSkins = playerShip.skins;
      var defaultSkin = DataStore.getDefaultSkin(playerShip);

      // Create a "default" skin from the ship's Hull part
      skins[defaultSkin.Id] = defaultSkin;

      for (var id in shipSkins) {
        var shipSkin = shipSkins[id];
        var hasPrice = shipSkin.price !== -1;

        if (shipSkin.owned || hasPrice) {
          skins[shipSkin.Id] = shipSkin;
        }
      }

      return skins;
    };

    SkinSelector.prototype.render = function render() {
      this.skinsList.renderList();

      var selectedSkin = Player.selectedSkin;

      if (!selectedSkin) {
        var playerShip = DataStore.getShip(Player.getShip());
        if (playerShip) {
          selectedSkin = DataStore.getPart(playerShip.parts[0]).Id;
        }
      }

      this.isFirstTime = true;

      this.skinsList.select(selectedSkin);

      utils.updateScope({
        'selectedSkinIndex': this.skinsList.currentIndex + 1,
        'numberOfSkins': this.skinsList.numberOfItems()
      }, VIEW);
    };

    SkinSelector.prototype.hideLockedMessage = function hideLockedMessage() {
      this.elLocked.classList.remove('visible');
    };

    SkinSelector.prototype.showLockedMessage = function showLockedMessage() {
      this.elLocked.classList.add('visible');
    };

    return new SkinSelector();
  }());

  var SkinsList = (function () {
    function SkinsList(options) {
      this.el = null;
      this.elList = null;
      this.elPrev = null;
      this.elNext = null;

      this.currentX = 0;

      this.renderItem = null;
      this.getItem = null;
      this.getItems = null;
      this.currentItem = null;
      this.currentIndex;

      if (options) {
        this.init(options);
      }
    }

    SkinsList.prototype.init = function init(options) {
      this.el = options.el;
      this.elList = this.el.querySelector('ul');
      this.elPrev = this.el.querySelector('.prev');
      this.elNext = this.el.querySelector('.next');

      this.renderItem = options.renderItem || function () {
        return '';
      };
      this.getItem = options.getItem || function () {
        return null;
      };
      this.getItems = options.getItems || function () {
        return {};
      };

      this.onSelect = options.onSelect || function () { };

      utils.onClick(this.elPrev, this.prev.bind(this));
      utils.onClick(this.elNext, this.next.bind(this));
    };

    SkinsList.prototype.refresh = function refresh() {
      this.renderList();

      var currentIndex = this.currentIndex;
      this.currentIndex = -1;
      this.currentItem = null;

      this.selectByIndex(currentIndex);
    };

    SkinsList.prototype.renderList = function renderList() {
      var html = '';
      var items = this.getItems();

      for (var id in items) {
        html += this.renderItem(items[id]);
      }

      this.elList.innerHTML = html;
    };

    SkinsList.prototype.prev = function prev() {
      this.selectByIndex(Math.max(this.currentIndex - 1, 0));
    };

    SkinsList.prototype.next = function next() {
      this.selectByIndex(Math.min(this.currentIndex + 1, this.numberOfItems()));
    };

    SkinsList.prototype.getIndexById = function getIndexById(itemId) {
      var items = this.getItems(),
        index = 0;

      for (var id in items) {
        if (itemId === id) {
          return index;
        }

        index++;
      }

      return -1;
    };

    SkinsList.prototype.selectByIndex = function selectByIndex(index) {
      index = Math.min(Math.max(index, 0), this.numberOfItems() - 1);

      var item = Object.keys(this.getItems())[index];

      this.select(item);
    };

    SkinsList.prototype.select = function select(itemId) {
      if (!itemId) {
        return;
      }

      var item = this.getItem(itemId);

      if (item) {
        var elCurrent = this.elList.querySelector('.active');
        var elNew = this.getItemElement(item.Id);

        elCurrent && elCurrent.classList.remove('active');
        elNew && elNew.classList.add('active');

        this.currentIndex = this.getIndexById(item.Id);
        this.currentItem = item;

        this.elPrev.dataset.enabled = this.currentIndex > 0;
        this.elNext.dataset.enabled = this.currentIndex < this.numberOfItems() - 1;

        if (Navigation.isVisible(VIEW)) {
          AudioPlayer.play(AudioPlayer.Selection);
        }

        this.onSelect(this.currentItem, this.currentIndex);

        // this.scrollListToCurrent();
      } else {
        console.warn('Trying to select non existant skin!', itemId);
      }
    };

    SkinsList.prototype.numberOfItems = function numberOfItems() {
      return Object.keys(this.getItems()).length;
    };

    SkinsList.prototype.getItemElement = function getItemElement(id) {
      return this.elList.querySelector('[data-id = "' + id + '"]');
    };

    // SkinsList.prototype.scrollListToCurrent = function scrollListToCurrent() {
    //   if (!this.currentItem) {
    //     return;
    //   }

    //   var el = this.getItemElement(this.currentItem.Id);
    //   var width = el && el.offsetWidth || 0;
    //   var left = el && el.offsetLeft || 0;
    //   var middle = this.elList.parentNode.offsetWidth / 2;
    //   var offset = Math.round(middle - left - width / 2);

    //   this.elList.style.transform = 'translateX(' + offset + 'px)';
    //   this.currentX = offset;
    // };

    return SkinsList;
  }());

  var ShipPurchase = (function ShipPurchase() {
    // var TEMPLATE_SKIN_LIST_ITEM = '<li class="cursor-over" data-id="{{Id}}" data-tooltip="{{name}}" data-tooltip-align="bottom center">' +
    //   '<div class="image" style="background-image: url({{skinIcon}});"></div>' +
    //   '</li>';

    function ShipPurchase() {
      this.el;

      this.onPurchase;
      this.ship;

    }

    ShipPurchase.prototype.init = function init(options) {
      this.el = options.el;
      utils.onClick(this.el.querySelector('.purchase'), this.purchase.bind(this));
      this.ship = DataStore.getShip(options.shipId);
      // this.render();

	  // When a ship has been purchased, refresh the skin list to either show or hide the skin unlock button
      utils.on('RefreshSkinsList', this.refreshSkinsList.bind(this));
    };

    ShipPurchase.prototype.render = function render(arg) {
      if (!arg) {
        return;
      }
      this.ship = DataStore.getShip(arg.shipId);
    };

    ShipPurchase.prototype.purchase = function purchase() {
      var ship = this.ship;

      if (ship) {
        Navigation.show(Navigation.VIEWS.UNLOCK, function onShow() {
          utils.dispatch('Unlock_Show', {
            'ship': ship,
            'type': 'purchase'
          });
        });
      }
    };
    
    ShipPurchase.prototype.refreshSkinsList = function refreshSkinsList() {
      SkinSelector.refresh();
    };

    return new ShipPurchase();
  }());

  var InfoTabs = (function InfoTabs() {

    function InfoTabs() {
      this.elTabs;
      this.current;
      this.DEFAULT_TAB = 'stats';
    }

    InfoTabs.prototype.init = function init(options) {
      this.elTabs = options.elTabs;

      this.loadDefaultTab();

      utils.onClick(this.elTabs, this.onClick.bind(this));
      
      utils.l10n.load(this.elTabs);

      this.elTabs.querySelectorAll('span').forEach(function(el) {
        utils.resizeFontToFit(el);
      });
    };

    InfoTabs.prototype.loadDefaultTab = function loadDefaultTab() {
      this.elTabs.querySelector('[data-tab="' + this.DEFAULT_TAB + '"]').classList.add('active');
      VIEW.el.querySelector('.tabs-container[data-tab="' + this.DEFAULT_TAB + '"]').classList.add('active');

      this.current = this.DEFAULT_TAB;
    };

    InfoTabs.prototype.onClick = function onClick(e) {
      if (e.target.tagName !== "LI" || this.current === e.target.dataset.tab === this.current) {
        return;
      }

      var el = e.target;
      var newTabType = el.dataset.tab;
      var currentTab = this.elTabs.querySelector('.active');
      var newTab = this.elTabs.querySelector('[data-tab="' + newTabType + '"]');
      var currentTabContainer = VIEW.el.querySelector('.tabs-container.active');
      var newTabContainer = VIEW.el.querySelector('.tabs-container[data-tab="' + newTabType + '"]');

      // Set new tab
      currentTab && currentTab.classList.remove('active');
      newTab && newTab.classList.add('active');

      // Set new container
      currentTabContainer && currentTabContainer.classList.remove('active');
      newTabContainer && newTabContainer.classList.add('active');

      this.current = newTabType;

      // Show the containers if the section is collapsed
      if (VIEW.el.querySelector('.column.left').classList.contains('collapsed')) {
        VIEW.el.querySelector('.column.left').classList.remove('collapsed');
      }
    };

    return new InfoTabs();
  })();

  var CrewSelect = (function CrewSelect() {

    var TEMPLATE_CREW_MEMBER = '<div class="crew-member" data-id="{{Id}}" data-tooltip="{{Name}}" data-tooltip-align="right">' +
      '<div class="crew-img" style="background-image: url(/frontend/images/crew/{{Id}}/hangar.png)"></div>' +
      '</div>';

    function CrewSelect() {
      this.el;
      this.editButton;
      this.currentId;
      this.firstLoad = true;
    }

    CrewSelect.prototype.init = function init(options) {
      this.el = options.el;
      this.elCrewWrapper = this.el.querySelector('.crew');
      this.prevArrow = this.el.querySelector('[data-direction="prev"]');
      this.nextArrow = this.el.querySelector('[data-direction="next"]');

      this.currentId = Player.selectedCrew;

      utils.onClick(this.elCrewWrapper, this.onClickCrew.bind(this));
      utils.onClick(this.prevArrow, this.onClick.bind(this));
      utils.onClick(this.nextArrow, this.onClick.bind(this));

      // When a crew gets removed, updated or when the CrewDB file is initialised,
      // update the arrows depending on how many teams there are
      utils.on('CrewRemoved', this.updateCrew.bind(this));
      utils.on('CrewCreated', this.updateCrew.bind(this));
      utils.on('CrewUpdated', this.updateCrew.bind(this));

      // Set Crew
      utils.on('CrewReady', this.updateCrew.bind(this));
      utils.on('CrewSelected', this.updateCrew.bind(this));

      utils.on('LoadCrewInHangar', this.updateCrew.bind(this));
      utils.on('FTUEComplete', this.updateCrew.bind(this));

      DataStore.whenReady(this.updateCrew.bind(this));
    };

    CrewSelect.prototype.updateArrows = function updateArrows() {
      if (Object.keys(CrewDB.getValidTeams()).length > 1) {
        this.prevArrow.classList.remove('hide');
        this.nextArrow.classList.remove('hide');
      } else {
        this.prevArrow.classList.add('hide');
        this.nextArrow.classList.add('hide');
      }
    };

    CrewSelect.prototype.updateCrew = function updateCrew(id) {
      if (!id) {
        id = Player.selectedCrew;
      }

      if (typeof id === "object") {
        id = id.Id;
      }
      if (id) {
        this.currentId = id;
        DataStore.whenReady(this.renderCrew.bind(this));
      }
      this.updateArrows();
    };

    CrewSelect.prototype.onClick = function onClick(e) {
      if (!e.target.classList.contains('arrow')) {
        return;
      }

      var el = e.target;
      var direction = el.dataset.direction;
      var teamKeys = Object.keys(CrewDB.teams)
      var current = teamKeys.indexOf(this.currentId);
      var newTeamIndex;

      if (direction === 'next') {
        newTeamIndex = teamKeys[current + 1] ? current + 1 : 0;
      } else {
        newTeamIndex = teamKeys[current - 1] ? current - 1 : teamKeys.length - 1;
      }

      Player.selectCrew(CrewDB.teams[teamKeys[newTeamIndex]].Id);
      this.currentId = Player.selectedCrew;
      this.renderCrew();
    };

    CrewSelect.prototype.renderCrew = function renderCrew() {
      !this.currentId && (this.currentId = Object.keys(CrewDB.teams)[0]);
      
      var html = '';
      var crew = CrewDB.getCrewMembers(this.currentId);

      if (!crew) {
        return;
      }

      for (var i = 0; i < crew.length; i++) {
        // If a crew member is falsey, exit out of the function
        if (!crew[i]) {
          return;
        }
        html += TEMPLATE_CREW_MEMBER.format(crew[i], false);
      }

      this.elCrewWrapper.innerHTML = html;

      utils.updateScope({
        'selectedCrew': this.currentId,
        'crewName': CrewDB.getTeam(this.currentId).Name
      }, VIEW);


      if (this.el.classList.contains('loading-crew')) {
        this.el.classList.remove('loading-crew');
        InfoTabs.elTabs.querySelector('[data-tab="crew"]').classList.remove('disabled');
      }
    };

    CrewSelect.prototype.onClickCrew = function onClickCrew(e) {
      if (!e.target.classList.contains('crew-member')) {
        return;
      }      

      var el = e.target;
      var id = el.dataset.id;

      if (id) {
        Navigation.show(Navigation.VIEWS.CREW_MEMBER, function onShow() {
          utils.dispatch('CrewMember_Show', {
            'id': id
          });
        });
      }
    };

    return new CrewSelect;

  })();

  var PlayerXPRewards = (function PlayerXPRewards() {

    function PlayerXPRewards() {
      this.el;
      this.elCurrentLevel;
      this.elNextLevel;
      this.xpBar;
      this.isVisible = false;
    }

    PlayerXPRewards.prototype.init = function init(options) {
      this.el = options.el;
      this.elCurrentLevel = this.el.querySelector('.current');
      this.elNextLevel = this.el.querySelector('.next');
      this.xpBar = this.el.querySelector('.progress-bar');

      if (Player.Rank.Rank < RankManager.ranks.length) {
        this.el.classList.remove('hidden');
        this.isVisible = true;
        utils.bindSVGContent(this.xpBar, this.realInit.bind(this));
      }
    };

    PlayerXPRewards.prototype.realInit = function realInit() {
      utils.updateScope({
        'currentLevel': Player.Rank.Rank,
        'nextLevel': RankManager.getNextRank(Player.Rank).Rank,
        'currentXP': Player.XPCurrent,
        'xpProgress': Player.XPProgress
      }, this.el);

      this.xpBar.querySelector('.progress-bar').style.transform = 'scaleX(' + Player.XPProgress + ')';
    };

    return new PlayerXPRewards;

  })();

  var LiveOps = (function LiveOps() {

    var TEMPLATE_CONTAINER = '<div class="live-ops-item {{IsActive}} event-ended-{{HasEventEnded}}" data-event-id="{{Id}}">{{ItemContent}}</div>';
    var TEMPLATE_ITEM = '<div class="live-ops-header">{{Name}}</div>' +
      '<div class="live-ops-tracked-stat">{{(f)CurrentProgress}} {{TrackedStat}}</div>' +
      '<div class="live-ops-progress-wrapper">{{Progress}}</div>';
    var TEMPLATE_PROGRESS = '<div class="left-border"></div>' +
      '<div class="right-border"></div>' +
      '<div class="live-ops-progress-bar-outer">' +
      '<div class="live-ops-progress-inner-bar" style="width: {{Width}}%"></div>' +
      '</div>' +
      '<div class="event-ended">' + utils.l10n.get('LiveOpsEventEnded') + '</div>';

    function LiveOps() {
      this.el;
      this.itemsWrapper;
      this.liveOps;
      this.trackedStats = [
        utils.l10n.get('LiveOpsTrackedStatKill'),
        utils.l10n.get('GenericLabelCaptures'),
        utils.l10n.get('GenericLabelDeaths'),
        utils.l10n.get('GenericLabelTakedowns'),
        utils.l10n.get('LiveOpsTrackedStatHealAssist'),
        utils.l10n.get('LiveOpsTrackedStatDamageAssist'),
        utils.l10n.get('LiveOpsTrackedStatBuffAssist'),
        utils.l10n.get('LiveOpsTrackedStatDebuffAssist'),
        utils.l10n.get('GenericLabelGamesCompleted'),
        utils.l10n.get('LiveOpsTrackedStatGameWin'),
        utils.l10n.get('LiveOpsTrackedStatMineCapture'),
        utils.l10n.get('LiveOpsTrackedStatForwardCapture'),
        utils.l10n.get('GenericLabelGammaCaps'),
        utils.l10n.get('GenericLabelEvent')
      ];
      this.eventTypes = [
        utils.l10n.get('LiveOpsTypeCommunity'),
        utils.l10n.get('LiveOpsTypePersonal'),
        utils.l10n.get('LiveOpsTypeTeam'),
        utils.l10n.get('LiveOpsTypeClan'),
        utils.l10n.get('LiveOpsTypeOther')
      ];
    }

    LiveOps.prototype.init = function init(options) {
      this.el = options.el;
      this.itemsWrapper = this.el.querySelector('.items-wrapper');
      this.liveOps = options.liveOps;

      utils.on('RemoveLiveOpsEvent', this.removeEvent.bind(this));
      this.checkIfEventsExist();
    };

    LiveOps.prototype.checkIfEventsExist = function checkIfEventsExist() {

      var keys = Object.keys(this.liveOps);
      var firstEvent = true;
      var counter = 0;

      for (var i = 0; i < keys.length; i++) {
        var event = this.liveOps[keys[i]];

        // If events remove time is greater than the current time, still display it
        if (new Date(event.removeAt).getTime() > new Date().getTime()) {
          this.buildWidget(event, firstEvent);
          counter++;
          if (i === 0) firstEvent = false;
        }
      }

      if (counter) {
        this.uiEvents();
        this.el.dataset.numberOfEvents = keys.length;
      } else {
        this.hideWidget();
      }

    };

    LiveOps.prototype.buildWidget = function buildWidget(event, isFirstEvent) {

      var container = this.buildContainer(event, this.buildProgress(event), this.buildItem(event), isFirstEvent);

      this.el.querySelector('.items-wrapper').innerHTML += container;

    };

    LiveOps.prototype.buildProgress = function buildProgress(event) {

      var html = '';
      var progress = event.globalProgress.rewards.length ? event.globalProgress : event.playerProgress;
      var percentage = utils.getPercentage(progress.currentProgress, progress.maxProgress);

      html = TEMPLATE_PROGRESS.format({
        'Width': percentage
      }, false);

      return html;

    };

    LiveOps.prototype.hasEventEnded = function hasEventEnded(event) {
      var endsAt = new Date(event.endsAt).getTime();
      var now = new Date().getTime();

      return now > endsAt;
    };

    LiveOps.prototype.buildItem = function buildItem(event) {

      var html = '';
      var trackedStat = this.getTrackedStat(event);
      var eventType = event.globalProgress.rewards.length ? 'globalProgress' : 'playerProgress';
      var progress = event[eventType];

      html = TEMPLATE_ITEM.format({
        'Name': event.name,
        'CurrentProgress': progress.currentProgress,
        'TrackedStat': trackedStat
      });

      return html;

    };

    LiveOps.prototype.buildContainer = function buildItem(event, progressHtml, itemHtml, isFirstEvent) {

      var html = '';
      var innerHtml = '';
      var hasEventEnded = this.hasEventEnded(event);

      innerHtml = itemHtml.format({
        'Progress': progressHtml
      }, false);

      html = TEMPLATE_CONTAINER.format({
        'ItemContent': innerHtml,
        'IsActive': isFirstEvent ? 'active' : '',
        'Id': event.guid,
        'HasEventEnded': hasEventEnded
      }, false);

      return html;

    };

    LiveOps.prototype.getTrackedStat = function getTrackedStat(event) {
      return this.trackedStats[event.trackedStat];
    };

    LiveOps.prototype.uiEvents = function uiEvents() {

      // Get the first event in the liveOps object and add the event type to the parent wrapper
      var firstEvent = this.liveOps[Object.keys(this.liveOps)[0]];
      this.el.dataset.eventType = this.getEventType(firstEvent).toLowerCase();

      // Add the event ID to the scroller wrapper
      this.applyIdToButton(firstEvent);

      if (this.itemsWrapper.childElementCount > 1) {
        this.bindArrowEvents();
      } else {
        this.hideArrows();
      }

      this.bindButton();

    };

    LiveOps.prototype.getEventType = function getEventType(event) {
      return this.eventTypes[event.eventType];
    };

    LiveOps.prototype.applyIdToButton = function applyIdToButton(event) {
      this.el.querySelector('.button').dataset.eventId = event.guid;
    };

    LiveOps.prototype.bindArrowEvents = function bindArrowEvents() {

      var leftArrow = this.el.querySelector('.arrow.left');
      var rightArrow = this.el.querySelector('.arrow.right');

      utils.onClick(leftArrow, this.showEvent.bind(this, 'prev'));
      utils.onClick(rightArrow, this.showEvent.bind(this, 'next'));

    };

    LiveOps.prototype.hideArrows = function hideArrows() {
      this.el.querySelector('.arrow.left').classList.add('hide');
      this.el.querySelector('.arrow.right').classList.add('hide');
    };

    LiveOps.prototype.showEvent = function showEvent(direction) {

      if (!direction) {
        return;
      }

      var elCurrentActive = this.el.querySelector('.active');
      var elButton = this.el.querySelector('.button');
      var currentEventId = elButton.dataset.eventId;
      var els = this.el.querySelectorAll('.live-ops-item');

      var elNewActive;

      var currentIndex;
      for (var i = 0; i < els.length; i++) {
        if (els[i].dataset.eventId === currentEventId) {
          currentIndex = i;
        }
      }

      elCurrentActive.classList.remove('active');
      elButton.dataset.eventId = '';

      if (direction === 'prev') {
        if (currentIndex - 1 < 0) {
          elNewActive = els[els.length - 1];
        } else {
          var newIndex = currentIndex - 1;
          elNewActive = els[newIndex];
        }
      } else if ('next') {
        if (currentIndex + 1 > els.length - 1) {
          elNewActive = els[0];
        } else {
          var newIndex = currentIndex + 1;
          elNewActive = els[newIndex];
        }
      } else {
        return;
      }

      elNewActive.classList.add('active');
      elButton.dataset.eventId = elNewActive.dataset.eventId;
      this.el.dataset.eventType = this.getEventType(this.liveOps[elNewActive.dataset.eventId]).toLowerCase();

    };

    LiveOps.prototype.bindButton = function bindButton() {

      var button = this.el.querySelector('.button');

      utils.onClick(button, this.loadEvent.bind(this));

    };

    LiveOps.prototype.loadEvent = function loadEvent(e) {

      if (!e.target.dataset.hasOwnProperty('eventId')) {
        return;
      }

      var eventId = e.target.dataset.eventId;

      Navigation.show(Navigation.VIEWS.PROFILE, function onShow() {
        utils.dispatch('CustomPageGameParam', {
          'page': 'profile',
          'param': 'events',
          'eventPage': eventId
        });
      });

    };

    LiveOps.prototype.removeEvent = function removeEvent(eventId) {
      if (!eventId) {
        return;
      }

      var el = this.itemsWrapper.querySelector('.live-ops-item[data-event-id="' + eventId + '"]');

      el.classList.remove('event-ended-false');
      el.classList.add('event-ended-true');
    };

    LiveOps.prototype.hideWidget = function hideWidget() {
      //this.el.classList.add('hide');
    };

    return new LiveOps();

  })();

  utils.l10n.whenReady(init);

})();

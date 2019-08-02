(function Results() {
  "use strict";

  var VIEW = Navigation.VIEWS.RESULTS;
  var selectedCrewView;

  var BOOSTER_SC_ID = 'A04D977D562C493A8E18E5B6EDCFA35F';
  var ARKAIN_BUNDLE = '6AB7EF24EB0E42FCB5AB7E35136A073E';
  var INFECTION_BUNDLE = 'C4F683EA533745569C14810EB6F0A117';

  var noXP = { "StatRewardArray": [{ "StatName": "Playing", "Reward": 0 }, { "StatName": "Takedowns", "Reward": 0 }, { "StatName": "SupportPoints", "Reward": 0 }, { "StatName": "InflictedDamage", "Reward": 0 }, { "StatName": "Captures", "Reward": 0 }], "Total": 0, "Raw": 0, "Bonus": 0, "Boost": 0 };

  var noSC = { "StatRewardArray": [{ "StatName": "Playing", "Reward": 0 }, { "StatName": "Takedowns", "Reward": 0 }, { "StatName": "SupportPoints", "Reward": 0 }, { "StatName": "InflictedDamage", "Reward": 0 }, { "StatName": "Captures", "Reward": 0 }], "Total": 0, "Raw": 0, "Bonus": 0, "Boost": 0 };

  var STAT_NAMES = {
    inflicteddamage: utils.l10n.get("GenericLabelDamage"),
    takedowns: utils.l10n.get("GenericLabelTakedowns"),
    playing: utils.l10n.get("ResultsPlaying"),
    captures: utils.l10n.get("GenericLabelCaptures"),
    supportpoints: utils.l10n.get("GenericLabelSupport")
  };

  var QUICK_PLAY_MATCH_TYPE = {
    Invalid: 0,
    Coop: 1,
    Pvp: 2
  };

  var TABS = {
    "Results": {
      "class": "results-selected",
      "tab": VIEW.el.querySelector("#results-tab"),
      "content": VIEW.el.querySelector(".player-results")},
   "Scoreboard": {
      "class": "scoreboard-selected",
      "tab": VIEW.el.querySelector("#scoreboard-tab"),
      "content": VIEW.el.querySelector(".scoreboard.teams")},
    "Breakdown": {
      "class": "breakdown-selected",
      "tab": VIEW.el.querySelector("#breakdown-tab"),
      "content": VIEW.el.querySelector("#breakdown-screen")},
    "Progress": {
      "class": "progress-selected",
      "tab": VIEW.el.querySelector("#progress-tab"),
      "content": VIEW.el.querySelector("#progress-screen")},
    "Leaderboard": {
      "class": "leaderboard-selected",
      "tab": VIEW.el.querySelector("#leaderboard-tab"),
      "content": VIEW.el.querySelector("#leaderboard-screen")}
    };

  var teamAllies = {};
  var teamEnemies = {};
  var PLAYERS = {};
  var MAIN_PLAYER = {};
  var gameAlliesLoaded, gameEnemiesLoaded;
  var statAllyIds = [], statEnemyIds = [];
  var resultsBreakdownHTMLCreated = false;
  var boosterApplied = false;
  var campaignProgress = {
    "dailyProgress": null,
    "weeklyProgress": null,
    "campaignsProgress": [],
    "eventProgress": null
  };

  var accessedFromHistory = false;

  var TEMPLATE_PLAYER_ROW =
    '<div class="nameplate" data-nameplate="{{NameplateGUID}}" data-playerid="{{PlayerId}}">' +
    '<video class="nameplate-video no-video">' +
      '<source></source>' +
    '</video>' +
    `<img class="avatar" onerror="this.src='images/default-avatar.png'">` +
      '<div class="details">' +
        '<div class="name">{{Name}}</div>' +
        '<div class="ship">{{ShipManu}}: {{Ship}}</div>' +
        '<div class="level">' + utils.l10n.get("ResultsPlayerLevel") + '</div>' +
      '</div>'+
      '<div class="badge" data-tooltip-align="bottom center"></div>' +
    '</div>' +
    '<div class="results-container">' +
    '<div class="player-stats stats takedowns">{{Takedowns}}</div>' +
    '<div class="player-stats stats deaths">{{Deaths}}</div>' +
    '<div class="player-stats stats support-points">{{SupportPoints}}</div>' +
    '<div class="player-stats stats captures">{{Captures}}</div>' +
    '</div>' +
    '<div class="reporting is-bot-{{IsBot}}" data-player-id="{{PlayerId}}">' +
    '<div>' +
    '<div class="feedback add-friend" src="images/friend.png" data-l10n=\'{"data-tooltip": "AddFriendTooltip"}\' data-add-friend="{{PlayerId}}" data-audio-hover></div>' +
    '<div class="feedback recommend" src="images/commend.png" data-l10n=\'{"data-tooltip": "CommendTooltip"}\' data-recommend="{{PlayerId}}" data-audio-hover></div>' +
    '<div class="feedback report-player" src="images/report.png" data-l10n=\'{"data-tooltip": "ReportTooltip"}\' data-report-player="{{PlayerId}}" data-audio-hover></div>' +
    '</div>' +
    '</div>';

  var TEMPLATE_WAVE_ROW = 
    '<div class="wave-num">{{Wave}}</div>' +
    '<div class="time">{{FormattedTime}}</div>' +
    '<div class="score">{{Score}}</div>' +
    '<div class="bonus">{{TimeBonus}}</div>' +
    '<div class="bonus">{{SurvivalBonus}}</div>';

  var TEMPLATE_REWARD_HTML = "<div class='career-tooltip earned-true'>" +
    "<div class='fluff fluff-top'>01987.3221.118</div>" +
    "<div class='career-level utility-color'>" + utils.l10n.get("ResultsCareerLevel") + "</div>" +
    "<div class='career-rank-name'>{{RankName}}</div>" +
    "<div class='career-reward utility-color rewards-true' data-l10n='ResultsRewardUnlocked'></div>" +
    "<div class='info-for-rewards has-rewards-true'>" +
    "{{Content}}" +
    "</div>" +
    "</div>";

  var TEMPLATE_REWARD_CONTENT = "<div class='career-title'>{{Name}}</div>" +
    "<div class='career-description'>{{Description}}</div>";

  var rewardManagerXP;
  var rewardManagerSC;
  var rewardManagerEliteXP;
  var boosterManager;
  var milestoneManager;
  var progressManager;
  var timeoutRewards;
  var didSkip = false;
  var medals = null;
  var leaderboards = null;
  var levelRewards = null;
  var validModeTypes = {
    nonSP: 0,
    Ftue: 1,
    FiringRange: 2,
    Flyby: 3,
    ProvingGroundsConquest: 4,
    ProvingGroundsFrontline: 5,
    WhizBang: 6,
    LegacyScenario: 7
  };

  var tickingXpOffset = 0;
  var tickRankPrev = null;
  var didLevelUp = false;
  var didShowLevelUp = false;
  var elProgress;
  var elXpProgressValue;
  var elXpEarnedProgress;
  var elBoostSC;
  var matchResult;
  var matchResultXP;
  var audioPlaysAllowed;
  var closedResultsForPack = false;
  var gameMode = DataStore.RESULTS_MODE_TYPES.UNKNOWN;
  var subGameMode = '';
  var matchResults = null;

  var fullStats;
  var playerCareerStats = [];
  var bestStats = {};

  var allies;
  var enemies;
  var playersAdded = false;
  var steamIdsToLoad = [];

  let nameplateManager = null;

  if (NameplateManager) {
    nameplateManager = new NameplateManager();
  } else {
    Load.js('script/NameplateManager.js', () => nameplateManager = new NameplateManager());
  }

  function init() {
    console.info('DEBUG: Results Screen init() start');
    elProgress = VIEW.el.querySelector('.progress .bar-wrapper');
    elXpProgressValue = VIEW.el.querySelector('.progressXP');
    elXpEarnedProgress = VIEW.el.querySelector('.progress .bar .earned');
    elBoostSC = VIEW.el.querySelector('.sc .boost-button');

    utils.onClick(elBoostSC, onClickBoostSC);

    var tabs = VIEW.el.querySelectorAll(".tab");

    for (var i = 0; i < tabs.length; i++) {
      tabs[i].addEventListener('mouseup', changeTab);
    }

    utils.on('Packs_Purchased', applyBooster);

    utils.on('resultsAnimationEnd', onAnimationsEnd.bind(this));
    utils.on('CustomPageGameParam',function customPageInit(options){
      if(options.page === Navigation.VIEWS.RESULTS.id && options.param === "prev"){
        if (VIEW.el.classList.contains("custom-match") || isSoloGameMode()){
          changeTab({'currentTarget': VIEW.el.querySelector("#scoreboard-tab")});
        } else {
          changeTab({'currentTarget': VIEW.el.querySelector("#result-tab")});
        }
        document.querySelector(".view-footer .battle-report").classList.add("hidden");
      } else if (options.page === Navigation.VIEWS.RESULTS.id && options.param === "history"){
        utils.on( "LoadMatchHistory", loadMatchHistory );
        utils.dispatch( "ReadyForMatchHistory" );
      }
    });
    VIEW.el.parentNode.addEventListener('webkitTransitionEnd', onShown);

    engine.on('CampaignsProgress', onGotCampaignProgress);
    engine.on('GameResult', onGotGameResult);
    engine.on('GameResultAlliesPlayers', onGotGameResultAllies);
    engine.on('GameResultEnemiesPlayers', onGotGameResultEnemies);
    engine.on('BoosterApplied', onBoosterApplied);
    engine.on('PlayerCareerStats', onGotPlayerCareerStats);

    //For results screen fakery
    engine.on('GameResult_Mock', onGotGameResult_Mock);
    engine.on('GameResultAlliesPlayers_Mock', onGotGameResultAllies_Mock);
    engine.on('GameResultEnemiesPlayers_Mock', onGotGameResultEnemies_Mock);
    engine.on('PlayerCareerStats_Mock', onGotPlayerCareerStats_Mock);

    console.info('DEBUG: Results Screen init() Complete');

    Navigation.onHide(VIEW, onHide);
  }

  function loadMatchHistory(matchData){
    accessedFromHistory = true;
    onGotGameResultAllies(matchData.Allies);
    onGotGameResultEnemies(matchData.Enemies);
    onGotGameResult(matchData.GameResult, matchData.Result);
  }

  function changeTab(e){
    var selectedTab = "";
    VIEW.el.querySelectorAll(".tab").forEach(function(tab){
      if (tab.classList.contains("selected")){
        selectedTab = tab.id;
      }
      tab.classList.remove("selected");
    });

    var tab = e.currentTarget;
    var customHeader = VIEW.el.querySelector(".custom-match");

    var contentEl = VIEW.el.querySelector(".view-content");
    contentEl.classList.remove(
      TABS.Results.class,
      TABS.Scoreboard.class,
      TABS.Breakdown.class,
      TABS.Progress.class,
      TABS.Leaderboard.class
      );

    switch (tab.id) {
      case "result-tab":
        contentEl.classList.add(TABS.Results.class);
        customHeader.style.display = null;
        break;
      case "scoreboard-tab":
        contentEl.classList.add(TABS.Scoreboard.class);
        customHeader.style.display = null;
        break;
      case "breakdown-tab":
        contentEl.classList.add(TABS.Breakdown.class);
        customHeader.style.display = "none";
        break;
      case "progress-tab":
        contentEl.classList.add(TABS.Progress.class);
        customHeader.style.display = null;
        if (TABS.Progress.content.dataset.hasShown !== "true") {
          setTimeout(function () {
            if (selectedCrewView && CrewDB.teams[Player.selectedCrew]) {
              selectedCrewView.show(CrewDB.teams[Player.selectedCrew]);
            }
            TABS.Progress.content.dataset.hasShown = true;
            rewardManagerEliteXP && rewardManagerEliteXP.start(MAIN_PLAYER.EliteXPReward);
          }.bind(rewardManagerEliteXP), 100);
        }
        break;
      case "leaderboard-tab":
        contentEl.classList.add(TABS.Leaderboard.class);
        customHeader.style.display = null;
        break;
      case "close-button":
        Navigation.hide('results', 'close-button');
        customHeader.style.display = null;
        break;
    }

    if (audioPlaysAllowed && tab.id !== "close-button" && tab.id !== selectedTab) {
      AudioPlayer.play(AudioPlayer.General_Confirm);
    }
    utils.reportEvent(Config.ANALYTICS.NAVIGATION_PAGE_ENTER, {
      'uiEventType': 'Results',
      'newPage': tab.id,
      'pagePosition': '',
      'navigationSource': ''
    });

    tab.classList.add("selected");
  }

  function onGotPlayerCareerStats_Mock(stats) {
    onGotPlayerCareerStats( JSON.parse( stats ) );
  }

  function onGotPlayerCareerStats(stats) {
    window.MOCK = window.MOCK || {};
    window.MOCK.careerStats = JSON.stringify( stats );
    //Some stats not returned
    playerCareerStats = stats;
    setupBreakdownStatsScreen();
  }

  function setupBreakdownStatsScreen( changeConfig ) {
    if (!fullStats) {
      fullStats = new FullStats();

      var statsConfig = FULLSTATS_CONFIG.RESULTS_CONQUEST;
      if ( gameMode === Config.GAME_MODE_IDS.PAYLOAD )
      {
        statsConfig = FULLSTATS_CONFIG.RESULTS_PAYLOAD;
      }
      else if ( subGameMode === Config.GAME_MODE_IDS.ARKAIN )
      {
        statsConfig = FULLSTATS_CONFIG.RESULTS_ARKAIN;
      }
      
      fullStats.init({
        'el': VIEW.el.querySelector('#breakdown-screen .stats-row'),
        'statKey': 'PlayerId',
        'statConfig': statsConfig
      });
    }
    if ( changeConfig )
    {
      var statsConfig = FULLSTATS_CONFIG.RESULTS_CONQUEST;
      if ( subGameMode === Config.GAME_MODE_IDS.PAYLOAD )
      {
        statsConfig = FULLSTATS_CONFIG.RESULTS_PAYLOAD;
      }
      else if ( gameMode === Config.GAME_MODE_IDS.ARKAIN || subGameMode === Config.GAME_MODE_IDS.ARKAIN )
      {
        statsConfig = FULLSTATS_CONFIG.RESULTS_ARKAIN;
      }
      fullStats.changeConfig( statsConfig );
    }

    if (!(MAIN_PLAYER && MAIN_PLAYER.PlayerId && playerCareerStats && playersAdded)) {
      //not ready
      return;
    }

    updateFullStatsBreakdown();

    fullStats.filterAndCompareStats(null, null, [bestStats]);

    if ( !resultsBreakdownHTMLCreated ) {
      createResultsBreakdownHTML('left');
      createResultsBreakdownHTML('right');
    }
    utils.l10n.load(VIEW.el);
  }

  function updateFullStatsBreakdown() {
    //Populate playerCareerStats with gameAllies / Enemies content
    var tempPlayerCareerStats = playerCareerStats.slice(0);
    for (var id in PLAYERS) {
      var statAddition = {
        'StatsOwnerId': parseInt( id ),
        'PlayerId': '*'
      };
      
      if (PLAYERS[id].StatsAmount) {
        for (var i = 0; i < PLAYERS[id].StatsAmount.length; i++ ) {
          statAddition["SA_" + PLAYERS[id].StatsAmount[i].StatName] = PLAYERS[id].StatsAmount[i].Amount;
        }
      }

      if (PLAYERS[id].ComboStats) {
        for (var key in PLAYERS[id].ComboStats) {
          statAddition[key] = PLAYERS[id].ComboStats[key];
        }
      }
      tempPlayerCareerStats.push(statAddition);
    }

    //Loop through all stats
    //Add to player_id total
    //Get best from that
    var playerTotals = {};
    bestStats = {};
    for ( var i = 0; i < tempPlayerCareerStats.length; i++ ) {
      playerTotals[tempPlayerCareerStats[i].StatsOwnerId] = playerTotals[tempPlayerCareerStats[i].StatsOwnerId] || {};
      for ( var key in tempPlayerCareerStats[i] ) {
        playerTotals[tempPlayerCareerStats[i].StatsOwnerId][key] = playerTotals[tempPlayerCareerStats[i].StatsOwnerId][key] || 0;
        playerTotals[tempPlayerCareerStats[i].StatsOwnerId][key] += parseInt( tempPlayerCareerStats[i][key] );

        bestStats[key] = bestStats[key] || 0;
        if ( bestStats[key] < playerTotals[tempPlayerCareerStats[i].StatsOwnerId][key] ) {
          bestStats[key] = playerTotals[tempPlayerCareerStats[i].StatsOwnerId][key];
        }
      }
    }

    fullStats.setFilter('StatsOwnerId', parseInt(MAIN_PLAYER.PlayerId));
    fullStats.updateStats(tempPlayerCareerStats);
  }

  function createResultsBreakdownHTML( side ) {
    side = side || "right";

    var BREAKDOWN_SELECTION_TEMPLATE = '<div class="comparison-stats {{team}}"></div>' +
      '<div class="comparison-selection">' +
      '<div class="title" data-l10n="BreakdownSelectionTitle"></div>' +
      '</div>' +
      '<div class="pip-selection">' +
      '<div class="arrow-left disabled"></div>' +
      '{{pips}}' +
      '<div class="arrow-right"></div>' +
      '</div>';

    var elBreakdown = VIEW.el.querySelector(".match-status .breakdown-header-" + side);
    var innerHTML = '';
    var playerIdArray = [];
    //Put player id first
    playerIdArray.push(parseInt(MAIN_PLAYER.PlayerId));

    //Add allies second
    for (var i = 0; i < statAllyIds.length; i++) {
      if (playerIdArray.indexOf(statAllyIds[i]) === -1) {
        playerIdArray.push(statAllyIds[i]);
      }
    }

    //Add enemies last
    for (var i = 0; i < statEnemyIds.length; i++) {
      if (playerIdArray.indexOf(statEnemyIds[i]) === -1) {
        playerIdArray.push(statEnemyIds[i]);
      }
    }

    for (var i = 0; i < playerIdArray.length; i++) {
      //Check player is not current player
      var selected = (i === 0).toString();
      var player = getPlayerScopeData(PLAYERS[playerIdArray[i]]);
      innerHTML += '<div class="pip selected-{{selected}} team-{{team}}" data-tooltip="{{tooltip}}" data-tooltip-align="bottom center" data-playerid="{{playerId}}"></div>'.format({
        selected: selected,
        playerId: playerIdArray[i],
        tooltip: player.Name + " - " + player.PlayerShip,
        team: player.team
      });
    }
    var elSelection = BREAKDOWN_SELECTION_TEMPLATE.format({
      pips: innerHTML
    }, false);

    elBreakdown.innerHTML = elSelection;

    //Create Comparison score template
    var compareScoreTemplate = VIEW.el.querySelector("#player-score-template").innerHTML.format({
      teamName: "enemies",
      player: "Comparison",
      title: utils.l10n.get("ResultsComparisonPlayer")
    });
    elBreakdown.querySelector('.comparison-stats').innerHTML = compareScoreTemplate;

    if ( side === "left" ) {
      var CurrentPlayer = getPlayerScopeData(PLAYERS[MAIN_PLAYER.PlayerId]);
      elBreakdown.classList.add("comparing");
      elBreakdown.classList.add("allies");
      utils.updateScope({
        Comparison: CurrentPlayer
      }, elBreakdown);
      var avatar = elBreakdown.querySelector(".avatar");
      if (avatar){
        avatar.dataset.steamId = CurrentPlayer.PlayerSteamId;
        avatar.setAttribute("src", PlayersInfo.get(CurrentPlayer.PlayerSteamId).avatarfull);
      }
    }

    utils.onClick(elBreakdown.querySelector(".pip-selection"), onBreakdownPipClicked.bind(this, side));

    resultsBreakdownHTMLCreated = true;
  }

  function onBreakdownPipClicked(side){
    var elBreakdown = VIEW.el.querySelector(".match-status .breakdown-header-" + side);
    var currentSelection = elBreakdown.querySelector(".pip-selection .selected-true");
    var newSelection;

    var pips = elBreakdown.querySelector(".pip-selection .pip");

    if (event.target.classList.contains("arrow-left")) {
      var prev = currentSelection && currentSelection.previousElementSibling;
      if (prev && prev.classList.contains("pip")) {
        newSelection = prev;
      } else {
        newSelection = pips[pips.length - 1];
      }
    } else if (event.target.classList.contains("arrow-right")) {
      var next = currentSelection && currentSelection.nextElementSibling;
      if (next && next.classList.contains("pip")) {
        newSelection = next;
      } else {
        newSelection = pips[0];
      }
    } else {
      newSelection = event.target;
    }

    if (audioPlaysAllowed) {
      AudioPlayer.play(AudioPlayer.Results_SelectPlayer);
    }
    if (currentSelection) {
      currentSelection.classList.remove("selected-true");
      currentSelection.classList.add("selected-false");
    }
    if (newSelection) {
      if (side === "right" && parseInt(newSelection.dataset.playerid) === parseInt(MAIN_PLAYER.PlayerId)) {
        elBreakdown.classList.remove("comparing");
        fullStats.resetComparison();
        fullStats.filterAndCompareStats(null, null, [bestStats]);
      } else {
        elBreakdown.classList.add("comparing");
        if ( side === "left" ) {
          //fullStats.setFilter('StatsOwnerId', parseInt(newSelection.dataset.playerid));
          fullStats.filterBaseStats('StatsOwnerId', parseInt(newSelection.dataset.playerid));
        } else {
          fullStats.filterAndCompareStats('StatsOwnerId', parseInt(newSelection.dataset.playerid));
        }
        //Display new comparison stats:

        var playerData = getPlayerScopeData(PLAYERS[newSelection.dataset.playerid]);
        utils.updateScope({
          Comparison: playerData
        }, VIEW.el.querySelector(".match-status .breakdown-header-" + side));

        elBreakdown.classList.remove("allies");
        elBreakdown.classList.remove("enemies");

        elBreakdown.classList.add(playerData.team);
      }
      newSelection.classList.add("selected-true");
      newSelection.classList.remove("selected-false");
      var statImage = elBreakdown.querySelector(".nameplate .avatar");
      if (playerData && parseInt(playerData.PlayerSteamId)) {
        statImage.setAttribute("src", PlayersInfo.get(playerData.PlayerSteamId).avatarfull);
      } else if (playerData && playerData.IsBot){
        var usableCrewIds = CrewDB.getUsableCrewIDs();
        var entryId = usableCrewIds[ Math.floor( Math.randomWithSeed(playerData.Name.hashString()) * usableCrewIds.length)];
        statImage.setAttribute("src", `/frontend/images/crew/${entryId}/profile-pic.png`);
      } else {
        statImage.setAttribute("src", 'images/default-avatar.png');
      }
    }

    elBreakdown.querySelector(".arrow-left").classList.remove("disabled");
    elBreakdown.querySelector(".arrow-right").classList.remove("disabled");
    if (!newSelection.previousElementSibling || !newSelection.previousElementSibling.classList.contains("pip")) {
      elBreakdown.querySelector(".arrow-left").classList.add("disabled");
    }
    if (!newSelection.nextElementSibling || !newSelection.nextElementSibling.classList.contains("pip")) {
      elBreakdown.querySelector(".arrow-right").classList.add("disabled");
    }
  }

  function onHide() {
    document.querySelector(".view-footer .battle-report").classList.remove("hidden");
    audioPlaysAllowed = false;
    utils.dispatch('ResultsDisableAudio');
    VIEW.el.dataset.pageParam = "";

    if (Player.FtueStage > 2) {

      if (subGameMode === Config.GAME_MODE_IDS.ARKAIN) {

        showUpsell(Config.GAME_MODE_IDS.ARKAIN, ARKAIN_BUNDLE, 'HasPlayedArkain');
      } else if (subGameMode === Config.GAME_MODE_IDS.INFECTION) {
        
        showUpsell(Config.GAME_MODE_IDS.INFECTION, INFECTION_BUNDLE, 'HasPlayedInfection');
      }
    }
  }

  function showUpsell(gameId, bundleId, hasPlayed) {
    var bundle = DataStore.getBundle(bundleId);

    if (!bundle) {
      return;
    }

    if (!Player[hasPlayed] && !bundle.owned) {
      Player[hasPlayed] = true;
      Navigation.show(Navigation.VIEWS.UPSELL, () => {
        utils.dispatch('ShowUpsellContent', gameId);
      });
    }
  }

  function onShown() {
    VIEW.el.parentNode.removeEventListener('webkitTransitionEnd', onShown);
    VIEW.el.classList.add('show-results');
    if (audioPlaysAllowed) {
      AudioPlayer.play(AudioPlayer.Results_Shown);
    }

    if (closedResultsForPack) {
      closedResultsForPack = false;
    }
  }

  function applyBooster() {

    if (VIEW.el.classList.contains('visible') && !boosterApplied) {
      engine.call('ApplyBooster');
    }
  }

  function updateBoosters() {
    if (!hasSCBoosters()) {
      elBoostSC.parentNode.removeChild(elBoostSC);
    }
  }

  function hasSCBoosters() {
    return (DataStore.getInventoryItem(BOOSTER_SC_ID).quantity > 0) ? true : false;
  }

  function onBoosterApplied() {
    console.info('DEBUG: Results Screen onBoosterApplied() Start');
    var elButton = null;
    var elTotal = null;
    var boostValue = 0;
    var newValue = 0;
    var colour = 'white';
    var rewardManager = null;

    rewardManager = rewardManagerSC;
    boostValue = MAIN_PLAYER.SC.Boost;
    newValue = MAIN_PLAYER.SC.Total + boostValue;
    elButton = elBoostSC;
    elTotal = VIEW.el.querySelector('.stats.sc .total .value');
    colour = '#4d8862';

    elButton.classList.add('activated');

    if (elButton.classList.contains('no-boosters')) {
      elButton.classList.remove('no-boosters');
    }

    elTotal.textContent = utils.numberWithCommas(newValue);

    var parentBounds = VIEW.el.getBoundingClientRect();
    var bounds = elTotal.getBoundingClientRect();

    var particles = new Particles({
      'position': new Victor(
        bounds.left - parentBounds.left + bounds.width / 2,
        bounds.top - parentBounds.top + bounds.height / 2
      ),
      'lifetime': [0.1, 0.4],
      'startRadiusX': bounds.width,
      'startRadiusY': bounds.height,
      'angle': [0, 360],
      'speed': [70, 240],
      'size': [2, 3],
      'gravity': 0,
      'colours': colour
    });

    particles.canvas.width = parentBounds.width;
    particles.canvas.height = parentBounds.height;
    VIEW.el.appendChild(particles.canvas);

    rewardManager.counter.apply(boostValue, null, function onBoosterAppliedEnd() {
      utils.dispatch('ResultsBoosterAppliedDone');

      onAnimationsEnd();
    });

    window.setTimeout(function startParticles() {
      particles.start(300);
    }, 0);

    boosterApplied = true;
    VIEW.el.querySelector('.stats.sc .total').classList.add('booster-applied');
    utils.dispatch('ResultsBoosterApplied');
    console.info('DEBUG: Results Screen onBoosterApplied() Complete');
  }

  function onClickBoostSC() {
    var hasBoostersSC = hasSCBoosters();

    if (hasBoostersSC) {
      applyBooster();
    } else {
      Navigation.show(Navigation.VIEWS.RESULTS_BUY_BOOSTER);
    }
  }

  /*
    'matchResultsInfo': {
      'LevelUpRewards': '', DONE
      'SinglePlayerModeStats': '',
      'MatchId': '', DONE
      'Duration': '', DONE
      'SinglePlayerMode': '',
      'HasLeveledUp': '',
      'IsCustomMatch': '',
      'IsQuickPlay': '',
      'QuickPlayMatchType': {0, 1, 2} = Invalid Coop Pvp
    }
  */

  function onGotGameResult_Mock( matchResultsInfo, result) {
    onGotGameResult( JSON.parse( matchResultsInfo ), JSON.parse( result ) );
  }

  function onGotCampaignProgress(dailyProgress, weeklyProgress, campaignsProgress, eventProgress) {
    campaignProgress.dailyProgress = dailyProgress;
    campaignProgress.weeklyProgress = weeklyProgress;
    campaignProgress.campaignsProgress = campaignsProgress;
    campaignProgress.eventProgress = eventProgress;
    utils.dispatch("ResultsCampaignProgress");
  }

  function writeMatchData(){
    let RESULT_LOOKUP = {
      0: "W",
      1: "L",
      2: "D"
    };

    let dateOptions = {'day': 'numeric','year':'numeric', 'month': "short", 'hour': "2-digit", 'minute': "2-digit"}
    let resultStr = (gameMode === DataStore.RESULTS_MODE_TYPES.HORDE) ? "LS" : RESULT_LOOKUP[MAIN_PLAYER.MatchResult];
    let matchDigest = { 
      "MatchId": matchResults.MatchId,
      "GameMode": gameMode.id,
      "Result": resultStr,
      "ShipGuid": MAIN_PLAYER.ShipGUIDString,
      "DateTime": new Date(Date.now() - (matchResults.Duration * 1000)).toLocaleDateString( (Player.lang) ? Player.lang : 'en-US' , dateOptions ),
      "Duration": getDuration(matchResults.Duration) 
    };

    engine.call("SaveStringToFile", Config.LOCAL_FILE_NAMES.MATCH_DIGEST, JSON.stringify(matchDigest), true, true);

    let matchData = {
      "Allies": allies,
      "Enemies": enemies,
      "GameResult": matchResults,
      "Result": MAIN_PLAYER
    };
    //TODO: Re-add this back in when there's some kind of sanitisation on load
    //engine.call("SaveStringToFile", matchResults.MatchId, JSON.stringify( matchData ), false );
  }

  function onGotGameResult(matchResultsInfo, result) {
    console.info('DEBUG: Results Screen onGotGameResult() start', matchResultsInfo.Duration, result, matchResultsInfo.MatchId, matchResultsInfo.IsCustomMatch);

    window.MOCK = window.MOCK || {};
    window.MOCK.matchResultsInfo = JSON.stringify( matchResultsInfo );
    window.MOCK.result = JSON.stringify( result );

    matchResults = matchResultsInfo;
    subGameMode = matchResults.SubGameMode;
    gameMode = determineModeType(matchResultsInfo);
    
    setupBreakdownStatsScreen( true );

    medals = new Medals({
      'view': VIEW,
      'elPopupContainer': VIEW.el.querySelector(".view-content"),
      'shouldGroup': false,
      'getMatchMedals': true
    });
    medals.on('gotMedals', onGotMedals);

    // Allow audio events to be played
    audioPlaysAllowed = true;

    // Scoped variable for match results
    matchResult = result;
    matchResultXP = { XPBefore: matchResultsInfo.PlayerXPBeforeMatch, XPAfter: matchResultsInfo.PlayerXPAfterMatch };

    DataStore.whenReady(updateBoosters);
    MAIN_PLAYER = result;

    var modeStats = matchResultsInfo.SinglePlayerModeStats;
    switch (gameMode){
      case DataStore.RESULTS_MODE_TYPES.CUSTOM_MATCH:
        VIEW.el.classList.add('custom-match');
        break;
      case DataStore.RESULTS_MODE_TYPES.HORDE:
        VIEW.el.classList.add("horde-match");
        setupHordeScoreboard(matchResultsInfo.WaveResults);
        break;
      case DataStore.RESULTS_MODE_TYPES.PVP:
        break;
      case DataStore.RESULTS_MODE_TYPES.PVE:
        VIEW.el.classList.add('quick-play');
        VIEW.el.classList.add('hide-player-mmr');
        break;
      case DataStore.RESULTS_MODE_TYPES.SP_CONQUEST:
      case DataStore.RESULTS_MODE_TYPES.SP_FRONTLINE:
        elBoostSC.style.display = 'none';
        var reportingEls = VIEW.el.querySelectorAll('.reporting');
        for (var i = 0; reportingEls.length > i; i++) {
          reportingEls[i].classList.add('disabled');
        }
        break;
        if (modeStats.PreviouslyRewarded){
          utils.updateScope({
            'SoloGameTitle': utils.l10n.get('SoloGameTitleSVA'),
            'SoloGameDescription': utils.l10n.get('SoloGameDescriptionSVA')
          });
          VIEW.el.classList.add('solo-games');

          MAIN_PLAYER.XP = noXP;
          MAIN_PLAYER.SC = noSC;
        }
      case DataStore.RESULTS_MODE_TYPES.FTUE:
        if (modeStats.PreviouslyRewarded){
          utils.updateScope({
            'SoloGameTitle': utils.l10n.get('SoloGameTitleFTUE'),
            'SoloGameDescription': utils.l10n.get('SoloGameDescriptionFTUE')
          });
          VIEW.el.classList.add('solo-games');

          MAIN_PLAYER.XP = noXP;
          MAIN_PLAYER.SC = noSC;
        }
        break;
    }

    VIEW.el.classList.add('animations-running');

    leaderboards = new SteamLeaderboards({
      "el": VIEW.el.querySelector("#leaderboard-screen .leaderboard.weekly"),
      "onLeaderboardsReceived": onLeaderboardsReceived,
      "mode": gameMode.id
    });

    MAIN_PLAYER.EliteXPReward = convertEliteXPToObject(MAIN_PLAYER);
    if (window.MOCK.resultAllies){
      onGotGameResultAllies_Mock(window.MOCK.resultAllies);
    }

    if (window.MOCK.resultEnemies){
      onGotGameResultEnemies_Mock(window.MOCK.resultEnemies);
    }

    // Setting this here as the doRewards is called too late if a player hits Progress before doRewards is called
    if (MAIN_PLAYER.EliteXPReward.Raw) {
      VIEW.el.querySelector('#progress-screen .crew-row').classList.add('show-elite-xp');
      rewardManagerEliteXP = new RewardManager({
        'el': VIEW.el.querySelector('.stats.elite-xp'),
        'countSpeed': MAIN_PLAYER.EliteXPReward.Raw < 2000 ? 1000 : MAIN_PLAYER.EliteXPReward.Raw * 0.5,
        'chartLineColour': 'rgba(255, 255, 255, 1)',
        'type': 'elite-xp',
        'audioStart': AudioPlayer.Results_TickStart,
        'audioEnd': AudioPlayer.Results_TickStop,
        'statNames': 'elite-xp',
        'audioPlaysAllowed': audioPlaysAllowed
      });
    }

    var CurrentPlayer = getPlayerScopeData(MAIN_PLAYER);
    utils.updateScope(CurrentPlayer);

    var nameplateAvatar = VIEW.el.querySelector(".captain-row .nameplate .avatar");
    nameplateAvatar.dataset.steamId = CurrentPlayer.PlayerSteamId;
    if (CurrentPlayer.PlayerSteamId){
      nameplateAvatar.setAttribute("src", PlayersInfo.get(CurrentPlayer.PlayerSteamId).avatarfull);
    } else {
      nameplateAvatar.setAttribute("src", 'images/default-avatar.png');
    }

    if ( allies && enemies ){
      addPlayers();
    } else {
      utils.on("playersLoaded", addPlayers);
    }
    
    var badgeEl = VIEW.el.querySelector(".captain-row .nameplate .badge");
    if (badgeEl && CurrentPlayer.BadgeId){
      badgeEl.style.backgroundImage = 'url("/frontend/images/badges/' + CurrentPlayer.BadgeId + '/small.png")';
      VIEW.el.querySelector(".captain-row .nameplate").classList.add("has-badge");
      var badge = DataStore.getBadge(CurrentPlayer.BadgeId);
      if (badge){ badgeEl.dataset.tooltip = DataStore.getBadgeTooltip(CurrentPlayer.BadgeId); }
    }

    progressManager = new ProgressManager({
      'el': VIEW.el.querySelector('.progress-row')
    });
    milestoneManager = new MilestoneManager({
      'el': VIEW.el.querySelector('.player-results .milestones')
    });

    if (matchResultsInfo.LevelUpRewards && matchResultsInfo.LevelUpRewards.length > 0) {
      levelRewards = new LevelRewards({
        'el': VIEW.el.querySelector('.level-rewards'),
        'rewards': matchResultsInfo.LevelUpRewards,
        'startingLevel': matchResultsInfo.LevelUpRewards.length > 1 ? RankManager.getRankByXP(matchResultXP.XPBefore).Rank + 1 : Player.Rank.Rank
      });
    }
    else if ( matchResultsInfo.ShouldHaveRewards && matchResultsInfo.HasLeveledUp )
    {
      console.info("No level up rewards found: ", matchResultsInfo.LevelUpRewards);
    }

    if (MAIN_PLAYER.XP.Total === 0) {
      VIEW.el.classList.add('no-xp');
    }
    if (MAIN_PLAYER.SC.Total === 0) {
      VIEW.el.classList.add('no-sc');
    }
    
    if ( gameMode === DataStore.RESULTS_MODE_TYPES.HORDE ) {
      //HORDE VICTORY
      VIEW.el.querySelector(".mission-complete-text .result-text").textContent = utils.l10n.get("GenericLabelMissionComplete");
    } else if ( MAIN_PLAYER.MatchResult === 0) {
      //VICTORY
      VIEW.el.querySelector(".mission-complete-text .result-text").textContent = utils.l10n.get("ResultsVictory");
    }
    else if (MAIN_PLAYER.MatchResult === 1) {
      //DEFEAT
      VIEW.el.querySelector(".mission-complete-text .result-text").textContent = utils.l10n.get("ResultsDefeat");
      VIEW.el.querySelector(".mission-complete-text").classList.add("is-defeat");

      VIEW.el.querySelector(".mission-complete-text .top .slash-before").textContent = utils.l10n.get("ResultsDefeat");
      VIEW.el.querySelector(".mission-complete-text .bot .slash-before").textContent = utils.l10n.get("ResultsDefeat");
      

      //set timeout for animating that slash thang
      setTimeout( function() {
        VIEW.el.querySelector(".mission-complete-text").classList.add("anim-slash");
      }, 3000 );
    }

    setTimeout( function() {
      VIEW.el.querySelector(".mission-complete-text").classList.add("anim-text");
    }, 1000 );

    if (modeStats) {
      var res_tab = VIEW.el.querySelector("#result-tab");
      var progress_tab = VIEW.el.querySelector("#progress-tab");
      var scoreboard_tab = VIEW.el.querySelector("#scoreboard-tab");
      var breakdown_tab = VIEW.el.querySelector("#breakdown-tab");
      var leaderboard_tab = VIEW.el.querySelector("#leaderboard-tab");
      switch (modeStats.Id) {
        case validModeTypes.nonSP:
          if (matchResultsInfo.IsCustomMatch) {
            res_tab.classList.add("disabled");
            progress_tab.classList.add("disabled");
            scoreboard_tab.classList.add("selected");
            leaderboard_tab.classList.add("disabled");
            leaderboard_tab.classList.add("hidden");
            changeTab({'currentTarget': scoreboard_tab});
            VIEW.el.classList.add("custom-match");
          } else if (matchResultsInfo.IsQuickPlay){
            if (matchResultsInfo.QuickPlayMatchType === 1) {
              //Coop
              progress_tab.classList.add("disabled");
              res_tab.classList.add("selected");
              changeTab({'currentTarget': res_tab});
            } else if (matchResultsInfo.QuickPlayMatchType === 2) {
              //PvP
              res_tab.classList.add("selected");
              changeTab({'currentTarget': res_tab});
            }
          } else {
            res_tab.classList.add("selected");
            changeTab({'currentTarget': res_tab});
          }
          showCrew();
          break;
        case validModeTypes.Ftue:
          res_tab.classList.remove("disabled");
          res_tab.classList.add("selected");
          changeTab({'currentTarget': res_tab});
          scoreboard_tab.classList.add("disabled");
          scoreboard_tab.classList.add("hidden");
          breakdown_tab.classList.add("disabled");
          breakdown_tab.classList.add("hidden");
          progress_tab.classList.add("disabled");
          progress_tab.classList.add("hidden");
          leaderboard_tab.classList.add("disabled");
          leaderboard_tab.classList.add("hidden");
          break;
        case validModeTypes.FiringRange:
        case validModeTypes.Flyby:
          //won't ever happen apparently
          break;
        case validModeTypes.ProvingGroundsConquest:
        case validModeTypes.ProvingGroundsFrontline:
          if (Player.Rank.Rank >= 15) {
            res_tab.classList.add("disabled");
            progress_tab.classList.add("disabled");
            scoreboard_tab.classList.add("selected");
            changeTab({'currentTarget': scoreboard_tab});
          } else {
            res_tab.classList.add("selected");
            changeTab({'currentTarget': res_tab});
            showCrew();
          }
          leaderboard_tab.classList.add("disabled");
          leaderboard_tab.classList.add("hidden");
          break;
        case validModeTypes.LegacyScenario:
          res_tab.classList.add("selected");
          changeTab({'currentTarget': res_tab});
          break;
      }
      if (MAIN_PLAYER.IsPureSpectator){
        progress_tab.classList.add("disabled");
        res_tab.classList.add("disabled");
        leaderboard_tab.classList.add("disabled");
        leaderboard_tab.classList.add("hidden");
        changeTab({'currentTarget': scoreboard_tab});
      }
    }

    highlightLocalPlayer();

    MAIN_PLAYER.matchId = matchResultsInfo.MatchId || '';
    utils.updateScope(MAIN_PLAYER, VIEW);

    // MatchResults: 0 = win, 1 = loss, 2 = draw

    if ( gameMode === DataStore.RESULTS_MODE_TYPES.HORDE ) {
      VIEW.el.classList.add('won-0');
    } else {
      if ('MatchResult' in result) {
        VIEW.el.classList.add('won-' + result.MatchResult);
      } else {
        VIEW.el.classList.add('won-' + (result.bDidWin ? 0 : 1));
      }
    }
    
    setXPProgressBar();
    window.setTimeout( doRewards.bind(this, result, matchResultsInfo), 1000);
    if ((campaignProgress.campaignsProgress && campaignProgress.campaignsProgress.length > 0) || campaignProgress.weeklyProgress|| campaignProgress.dailyProgress || campaignProgress.eventProgress){
      doCampaignProgress();
    } else {
      utils.on("ResultsCampaignProgress", doCampaignProgress);
    }

    nameplateManager.init({
      selector: ".player .nameplate",
      el: VIEW.el,
      localPlayerId: MAIN_PLAYER.PlayerId,
      playOnHover: true
    });
  }

  function onLeaderboardsReceived(){
    var lb = this.getCurrentLeaderboard();
    if ( lb ) {
      this.showLeaderboard(lb.Friends, this.el.querySelector(".friends"), lb.CurrentPlayer);
      this.showLeaderboard(lb.Relative, this.el.querySelector(".relative"), lb.CurrentPlayer);
    }
    if (!this.hasFinishedSetup){
      this.hasFinishedSetup = true;
      this.updatePlayerData();
    }
  }

  function determineModeType( matchResultsInfo){
    var modeStats = matchResultsInfo.SinglePlayerModeStats;
    var mode = "";
    switch (modeStats.Id) {
      case validModeTypes.nonSP:
        if (matchResultsInfo.IsCustomMatch) {
          mode = DataStore.RESULTS_MODE_TYPES.CUSTOM_MATCH;
        } else if (matchResultsInfo.QuickPlayMatchType === 1) {
          mode = DataStore.RESULTS_MODE_TYPES.PVE;
        } else if (matchResultsInfo.QuickPlayMatchType === 2 || (matchResultsInfo.QuickPlayMatchType === 0 && matchResultsInfo.SubGameMode === "conquest") || (matchResultsInfo.QuickPlayMatchType === 0 && matchResultsInfo.SubGameMode === "discovery")) {
          mode = DataStore.RESULTS_MODE_TYPES.PVP;
        } else if (matchResultsInfo.QuickPlayMatchType === 3){
          mode = DataStore.RESULTS_MODE_TYPES.HORDE;
        }
        break;
      case validModeTypes.Ftue:
        mode = DataStore.RESULTS_MODE_TYPES.FTUE;
        break;
      case validModeTypes.FiringRange:
      case validModeTypes.Flyby:
        //won't ever happen apparently
        break;
      case validModeTypes.ProvingGroundsConquest:
        mode = DataStore.RESULTS_MODE_TYPES.SP_CONQUEST;
        break;
      case validModeTypes.ProvingGroundsFrontline:
        mode = DataStore.RESULTS_MODE_TYPES.SP_FRONTLINE;
        break;
      case validModeTypes.LegacyScenario:
        if (subGameMode === 'horde') {
          mode = DataStore.RESULTS_MODE_TYPES.HORDE;
          subGameMode = '';
        } else {
          mode = DataStore.RESULTS_MODE_TYPES.LEGACY;
        }
        break;
    }
    return mode;
  }

  function isSoloGameMode() {
    if ( gameMode ) {
      switch ( gameMode.id ) {
        case validModeTypes.SP_CONQUEST:
        case validModeTypes.SP_FRONTLINE:
          return true;
        default:
          return false;
      }
    }
    return false;
  }

  function formatTime(timeInSeconds){
    var timeStr = "";
    if (timeInSeconds < 60){
      timeStr = Math.floor(timeInSeconds).toString();
      if (Math.floor(timeInSeconds).toString().length < 2){
        timeStr = "0" + timeStr;
      }
      timeStr = "00:" + timeStr;
    } else if (timeInSeconds < 3600){
      var mins = Math.floor(timeInSeconds / 60).toString();
      var secs = Math.floor(timeInSeconds % 60).toString();
      
      if (mins.length < 2){
        mins = "0" + mins;
      }
      if (secs.length < 2){
        secs = "0" + secs;
      }
      timeStr = mins + ":" + secs;
    } else {
      var hrs = Math.floor(timeInSeconds / 3600).toString();
      var mins = Math.floor((timeInSeconds % 3600) / 60).toString();
      var secs = Math.floor((timeInSeconds % 3600) % 60).toString();

      if (hrs.length < 2){
        hrs = "0" + hrs;
      }
      if (mins.length < 2){
        mins = "0" + mins;
      }
      if (secs.length < 2){
        secs = "0" + secs;
      }
      timeStr = hrs + ":" + mins + ":" + secs;
    }
    return timeStr;
  }

  function setupHordeScoreboard(waves){
    var waveContainer = VIEW.el.querySelector(".wave-results");
    var waveEl = null;
    var totalTimeBonus = 0;
    var totalSurvivalBonus = 0;
    var totalWaveScore = 0;
    for (var i = 0; i < waves.length; i++){
      waveEl = document.createElement("div");
      waveEl.classList.add("wave-row");
      var wave = waves[i];
      // I don't like using +=, needless contraction. Love, jacob
      totalWaveScore = totalWaveScore + wave.Score;
      totalTimeBonus = totalTimeBonus  + wave.TimeBonus;
      totalSurvivalBonus = totalSurvivalBonus + wave.SurvivalBonus;
      wave.FormattedTime = formatTime(wave.Time);
      waveEl.innerHTML = TEMPLATE_WAVE_ROW.format(wave);
      waveContainer.appendChild(waveEl);
    }

    var waveScoreEl = VIEW.el.querySelector(".wave-score");
    utils.updateScope({
      "FrigateBonus": MAIN_PLAYER.HordeFrigateKillsScore || 0 ,
      "CapshipBonus": MAIN_PLAYER.HordeCapitalShipKillsScore || 0 ,
      "TimeBonus": totalTimeBonus || 0,
      "SurvivalBonus": totalSurvivalBonus || 0 ,
      "WaveBonus": totalWaveScore || 0 ,
      "HordeScore": MAIN_PLAYER.HordeScore || 0
    } ,waveScoreEl);
  }

  function convertEliteXPToObject(result) {
    if (!result.EliteXPReward) {
      result.EliteXPReward = 0;
    }
    return {
      'Bonus': 0,
      'Boost': 0,
      'Raw': result.EliteXPReward,
      'StatRewardArray': [
        {
          StatName: "elite-xp",
          Reward: result.EliteXPReward
        }
      ],
      'Total': result.EliteXPReward
    };
  }

  function doCampaignProgress(){
    if (DataStore.campaignsProgress){
      actuallyDoCampaignProgress();
    } else {
      utils.on('CampaignDataReceived', actuallyDoCampaignProgress);
    }
  }

  function actuallyDoCampaignProgress(){
    try{
      addCampaignProgressMilestones(campaignProgress.dailyProgress, DataStore.CAMPAIGN_TYPES.QUICK);
      addCampaignProgressMilestones(campaignProgress.weeklyProgress, DataStore.CAMPAIGN_TYPES.WEEKLY);

      var galacticCampaignsProgress = [];
      var found = false;
      var foundProgress;
      
      for ( var i = 0; i < campaignProgress.campaignsProgress.length; i++){
        var currentProgress = campaignProgress.campaignsProgress[i];
        found = false
        if (currentProgress.stageIndex === -1){
          galacticCampaignsProgress.push(currentProgress);
        } else {
          for (var j = 0; j < galacticCampaignsProgress.length; j++){
            var galProg = galacticCampaignsProgress[j];
            if ( galProg.guid == currentProgress.guid){
              found = true;
              foundProgress = j;
              break;
            }
          }
        }
        if (found){
          galacticCampaignsProgress.splice(j,1);
          galacticCampaignsProgress.push(currentProgress);
        } else {
          galacticCampaignsProgress.push(currentProgress);
        }
      }

      for (var i = 0; i < galacticCampaignsProgress.length; i++){
        addCampaignProgressMilestones(galacticCampaignsProgress[i], DataStore.CAMPAIGN_TYPES.GALACTIC);
      }

      addCampaignProgressMilestones(campaignProgress.eventProgress, DataStore.CAMPAIGN_TYPES.EVENT);
    }catch(e){ console.error("something went wrong in campaigns progress");}
  }

  function addCampaignProgressMilestones( progress, campaignType){
    if (progress.shouldShow){

      var progressTitle = "";
      var unlockText = "";
      var progressImage = "";
      var icon = "";
      if (campaignType === DataStore.CAMPAIGN_TYPES.GALACTIC){
        var campaign = DataStore.getCampaign( progress.guid, DataStore.CAMPAIGN_TYPES.GALACTIC);
        var missionAcc = 0;
        var currentMissionIdx = progress.stageIndex;
        if (progress.stageIndex > -1){
          currentMissionIdx = progress.stageIndex;
        } else {
          currentMissionIdx = progress.rewards.length;
        }

        for (var i = 0; i < campaign.nodes.length; i++){
          if ( currentMissionIdx >= missionAcc && currentMissionIdx < (missionAcc + campaign.nodes[i].items.length) ){
            break;
          }
          missionAcc += campaign.nodes[i].items.length;
        }

        var missionString = "";
        if (campaign.tokenGUID){
          missionString = campaign.title + ' ' + (i + 1) + '.' + (currentMissionIdx - missionAcc + 1);

        } else {
          missionString = (i + 1) + "." + (currentMissionIdx - missionAcc + 1);
        }

        unlockText = campaign.title;
        if (campaign.tokenGUID){
          progressTitle = utils.l10n.get('PremiumCampaignGalacticMilestoneProgress').format({"MissionNo": missionString});
        } else {
          progressTitle = utils.l10n.get('CampaignGalacticMilestoneProgress').format({ "CampaignName": campaign.title,"MissionNo": missionString});
        }
        icon = "/frontend/views/results/images/galactic-icon.svg";
        progressImage = "/frontend/views/profile/images/campaigns/" + utils.convertFirelineToGuid(progress.guid) + ".png";
      } else if (campaignType === DataStore.CAMPAIGN_TYPES.WEEKLY){
        unlockText = utils.l10n.get('CampaignWeeklyMilestoneComplete').format({ "MissionNo": (progress.stageIndex + 1)});
        progressTitle = utils.l10n.get('CampaignWeeklyMilestoneProgress').format({ "MissionNo": (progress.stageIndex + 1)});
        icon = "/frontend/views/results/images/weekly-icon-s.png";
        progressImage = "/frontend/views/results/images/weekly-icon-l.png";
      } else if (campaignType === DataStore.CAMPAIGN_TYPES.QUICK){
        unlockText = utils.l10n.get('GenericLabelQuickMission');
        progressTitle = utils.l10n.get('GenericLabelQuickMission');
        icon = "/frontend/views/results/images/daily-icon-s.png";
        progressImage = "/frontend/views/results/images/daily-icon-l.png";
      } else if (campaignType === DataStore.CAMPAIGN_TYPES.EVENT){
        var campaign = DataStore.getCampaign( progress.guid, DataStore.CAMPAIGN_TYPES.EVENT);
        unlockText = utils.l10n.get('CampaignEventMilestoneComplete').format( {"EventName": campaign.title, "MissionNo": (progress.stageIndex + 1)});
        progressTitle = utils.l10n.get('CampaignEventMilestoneProgress').format( {"EventName": campaign.title, "MissionNo": (progress.stageIndex + 1)});
        icon = "/frontend/views/profile/images/campaigns/" + utils.convertFirelineToGuid(progress.guid) + "-icon-s.png";
        progressImage = "/frontend/views/profile/images/campaigns/" + utils.convertFirelineToGuid(progress.guid) + "-icon-l.png";
      }

      if (progress.completed){
        var reward;

        progress.rewards = progress.rewards || [];
        if (progress.rewards.length > 0 ){
          for (var i = 0; i < progress.rewards.length; i++){
            reward = progress.rewards[i];

            var itemType = DataStore.determineItemType(reward.id);
            reward.rewardName = Campaigns.getRewardName( itemType, reward.quantity );
          }
        } else if ( campaignType === DataStore.CAMPAIGN_TYPES.GALACTIC && campaign.tokenGUID ){
          progress.campaign = progress.guid;
          progress.missionIndex = progress.stageIndex;
          var campaignReward = DataStore.getRewardItemForCampaignMission( progress );
          reward = DataStore.getRewardItem(campaignReward);
          var itemType = DataStore.determineItemType(reward.id);
          reward.rewardName = Campaigns.getRewardName( itemType, reward.quantity );
          progress.rewards.push(reward);
        }

        for (var i = 0; i < progress.rewards.length; i++){
          reward = progress.rewards[i];

          milestoneManager.addMilestone({
            'Title': utils.l10n.get("GenericLabelMissionComplete"),
            'overrideImage': (reward) ? DataStore.getItemImage(reward.id, true) : "",
            'overrideIcon': (campaignType === DataStore.CAMPAIGN_TYPES.EVENT) ? icon : null,
            'UnlockText': unlockText,
            'UnlockName': reward.rewardName,
            'Source': campaignType,
            'Campaign': campaign
          });
        }
      } else {
        var total = 0;
        var before = 0;
        var earned = 0;
        for (var i = 0; i < progress.objectives.length; i++){
          total += progress.objectives[i].threshold;
          before += progress.objectives[i].currentProgress;
          earned += progress.objectives[i].deltaProgress;
        }
        var progressData = {
          'Title': progressTitle,
          'Image': progressImage,
          'before': before,
          'earned': earned,
          'total': total
        };
        if (earned > 0){
          progressManager.addProgress( progressData );
        }
      }
    }
  }

  function doRewards(result, matchResultsInfo) {
    rewardManagerXP = new RewardManager({
      'el': VIEW.el.querySelector('.stats.xp'),
      'countSpeed': result.XP.Raw < 2000 ? 1000 : result.XP.Raw * 0.5,
      'onCountTick': onXPCountTick,
      'chartLineColour': 'rgba(255, 255, 255, 1)',
      'type': 'xp',
      'audioStart': AudioPlayer.Results_TickStart,
      'audioEnd': AudioPlayer.Results_TickStop,
      'statNames': STAT_NAMES,
      'audioPlaysAllowed': audioPlaysAllowed
    });
    rewardManagerSC = new RewardManager({
      'el': VIEW.el.querySelector('.stats.sc'),
      'countSpeed': result.SC.Raw < 2000 ? 1000 : result.SC.Raw * 0.5,
      'chartLineColour': 'rgba(85, 165, 195, 1)',
      'type': 'c',
      'audioStart': AudioPlayer.Results_TickStart,
      'audioEnd': AudioPlayer.Results_TickStop,
      'statNames': STAT_NAMES,
      'audioPlaysAllowed': audioPlaysAllowed
    });
    boosterManager = new BoosterManager({
      'el': VIEW.el.querySelector('.boosters'),
      'boosters': matchResult.BoostersArray
    });
    boosterManager.start();

    showMatchDuration(matchResultsInfo.Duration);

    //RewardPackDoneOrDismissed is fired if there is no pack, the pack is saved for later or when the pack has been opened.
    startRewards();

    console.info('DEBUG: Results Screen onGotGameResult() finish');

    setupBreakdownStatsScreen();
  }

  function getPlayerScopeData(playerData) {
    if (!playerData) {
      return;
    }
    var playerIcon;
    var playerRankLevel = "";
    if (playerData.Rank) {
      playerIcon = playerData.Rank.RankIconGold;
      playerRankLevel = playerData.Rank.Rank;
    }
    var ship = DataStore.getShip(playerData.ShipGUIDString);
    var playerShip =  DataStore.getManufacturer(ship.manufacturerId).shortName + ': ' + ship.name;
    var CurrentPlayer = {
      'team': playerData.isAlly ? "allies" : "enemies",
      'Name': playerData.Name,
      'PlayerShip': playerShip,
      'PlayerSteamId': playerData.SteamIdString,
      'PlayerTakedowns': null,
      'PlayerDeaths': null,
      'PlayerSupport': null,
      'PlayerCaptures': null,
      'RankIcon': playerIcon,
      'RankLevel': playerRankLevel,
      'IsBot': playerData.IsBot,
      'BadgeId': playerData.BadgeId
    };

    var stat;
    for (var i = 0; i < playerData.StatsAmount.length; i++) {
      stat = playerData.StatsAmount[i];
      switch (stat.StatName) {
        case "Takedowns":
          CurrentPlayer.PlayerTakedowns = stat.Amount;
          break;
        case "Captures":
          CurrentPlayer.PlayerCaptures = stat.Amount;
          break;
        case "Deaths":
          CurrentPlayer.PlayerDeaths = stat.Amount;
          break;
        case "SupportPoints":
          CurrentPlayer.PlayerSupport = stat.Amount;
          break;
      }
    }

    return CurrentPlayer;
  }

  function showCrew() {
    var crewId = Player.selectedCrew;
    if (!crewId) {
      return;
    }

    utils.on('CrewMemberLevelUp', crewLeveledUp);
    selectedCrewView = new SelectedCrewView({
      'VIEW': VIEW,
      'elCards': VIEW.el.querySelector('.current-crew'),
      'xpAmountReceived': MAIN_PLAYER.XP.Total,
      'needsDragger': false,
      'playAudioOnce': true,
      'defaultCrew': CrewDB.teams[Player.selectedCrew]
    });
  }

  function crewLeveledUp(){
    
  }

  function highlightLocalPlayer() {
    var elRow = VIEW.el.querySelector('[data-player-id = "' + MAIN_PLAYER.PlayerId + '"]');
    if (elRow) {
      elRow.classList.add('own-player');
    }
    hideReportingOnSelf();
  }

  function hideReportingOnSelf() {
    var reportTd = VIEW.el.querySelector('.reporting[data-player-id="' + MAIN_PLAYER.PlayerId + '"]');
    if (reportTd) {
      reportTd.classList.add('disabled');
    }
  }

  function setXPProgressBar() {
    tickRankPrev = RankManager.getRankByXP(matchResultXP.XPBefore);

    // Set up the bar for the animations
    var range = tickRankPrev.NextRankXP - tickRankPrev.PrevRankXP;
    var percent = (matchResultXP.XPBefore - tickRankPrev.PrevRankXP) / range * 100;

    var prevRankTooltip = getRankTooltip(tickRankPrev);

    utils.updateScope({
      'Progress': {
        'XPEarned': MAIN_PLAYER.XP.Total,
        'XPBefore': matchResultXP.XPBefore,
        'XPBeforePercent': percent + '%',
        'RankPrev': tickRankPrev,
        'RankNext': RankManager.getNextRank(tickRankPrev),
        'PrevRankRewards': prevRankTooltip,
        'NextRankRewards': getRankTooltip(RankManager.getNextRank(tickRankPrev))
      }
    }, VIEW);
    VIEW.el.querySelector(".rank.prev").style.backgroundImage = 'url(images/ranks/' + tickRankPrev.Rank + '_gold.png)';
    VIEW.el.querySelector(".rank.next").style.backgroundImage = 'url(images/ranks/' + RankManager.getNextRank(tickRankPrev).Rank + '_gold.png)';
  }

  function getRankTooltip(rank) {
    if (!rank.RankRewards.length) {
      return '';
    }

    var html = '';
    var template = TEMPLATE_REWARD_HTML.format({
      'Rank': rank.Rank,
      'RankName': rank.RankName
    }, false);
    var content = '';

    // Loop through Rank Rewards
    for (var i = 0; rank.RankRewards.length > i; i++) {
      var RankReward = rank.RankRewards[i];

      content += TEMPLATE_REWARD_CONTENT.format({
        'Name': RankReward.RewardItem,
        'Description': RankReward.RewardDescription
      }, false);
    }

    html = template.format({
      'Content': content
    }, false);

    return html;
  }

  function onXPCountTick(value) {
    var range = tickRankPrev.NextRankXP - tickRankPrev.PrevRankXP;
    var percentEarned = Math.max(Math.min((value - tickingXpOffset) / range * 100, 100), 0);
    var xpValue = matchResultXP.XPBefore + value;

    elXpProgressValue.textContent = utils.numberWithCommas(xpValue);
    elXpEarnedProgress.style.width = percentEarned + '%';

    if (xpValue >= tickRankPrev.NextRankXP) {
      tickingXpOffset = value;
      tickRankPrev = RankManager.getNextRank(tickRankPrev);

      didLevelUp = true;
      if (audioPlaysAllowed) {
        AudioPlayer.play(AudioPlayer.Results_LevelUp);
      }

      elXpEarnedProgress.style.width = '0%';

      var nextRank = RankManager.getNextRank(tickRankPrev);

      VIEW.el.querySelector(".rank.prev").style.backgroundImage = 'url(images/ranks/' + tickRankPrev.Rank + '_gold.png)';
      VIEW.el.querySelector(".rank.next").style.backgroundImage = 'url(images/ranks/' + nextRank.Rank + '_gold.png)';

      utils.updateScope({
        'Progress': {
          'XPBefore': 0,
          'XPBeforePercent': '0%',
          'RankPrev': tickRankPrev,
          'RankNext': RankManager.getNextRank(tickRankPrev),
          'PrevRankRewards': getRankTooltip(tickRankPrev),
          'NextRankRewards': getRankTooltip(nextRank),
          'AnimateLevelUp': didLevelUp,
          'LeveledUp': didLevelUp
        }
      }, VIEW);

      // SHOW PARTICLES
      var elBar = VIEW.el.querySelector('.progress .bar');

      var particlesLeft = new Particles({
        'position': new Victor(150,75),
        'lifetime': [0.2, 0.8],
        'angle': [-30, 75],
        'speed': [70, 300],
        'size': [1, 2.5],
        'gravity': 600,
        'colours': ['#feeda3', '#c7993b', '#ffffff']
      });

      var particlesRight = new Particles({
        'position': new Victor(150,75),
        'lifetime': [0.2, 0.8],
        'angle': [-75, 30],
        'speed': [70, 300],
        'size': [1, 2.5],
        'gravity': 600,
        'colours': ['#feeda3', '#c7993b', '#ffffff']
      });

      elBar.appendChild(particlesLeft.canvas);
      elBar.appendChild(particlesRight.canvas);
      particlesLeft.canvas.style.left = "-150px";
      particlesRight.canvas.style.left = "calc(100% - 150px)";
      particlesRight.canvas.style.top = particlesLeft.canvas.style.top = "-75px";
      particlesLeft.start(200);
      particlesRight.start(200);
    }
  }

  function startRewards() {
    elProgress.classList.add('count-xp');
    rewardManagerXP.start(MAIN_PLAYER.XP, function onXPDone() {
      window.setTimeout(function onXPDelayDone() {
        utils.dispatch('ResultsRewardsDone', {
          'type': 'xp'
        });

        elProgress.classList.remove('count-xp');
        elProgress.classList.add('count-sc');

        rewardManagerSC.start(MAIN_PLAYER.SC, function onSCDone() {
          elProgress.classList.remove('count-sc');

          utils.dispatch('ResultsRewardsDone', {
            'type': 'sc'
          });
          utils.dispatch('resultsAnimationEnd');
        });
      }, (didSkip ? 0 : 500));
    });
  }

  function onAnimationsEnd() {
    VIEW.el.classList.remove('animations-running');

    elXpProgressValue.textContent = utils.numberWithCommas(matchResultXP.XPAfter);

    if (didLevelUp && !didShowLevelUp) {
      didShowLevelUp = true;
      if (Navigation.isOverlayVisible(Navigation.VIEWS.RESULTS)) {
        Navigation.show(Navigation.VIEWS.LEVEL_UP);
        utils.on('HideVideo', milestoneManager.showMilestones.bind(milestoneManager));
      }
      else
      {
        milestoneManager.showMilestones();
      }
    }
    else
    {
      milestoneManager.showMilestones();
    }

    utils.dispatch('ResultsAnimationsEnd');
  }

  function onGotGameResultAllies_Mock(players) {
    onGotGameResultAllies( JSON.parse( players ) );
  }

  function onGotGameResultAllies(allyData) {
    window.MOCK = window.MOCK || {};
    window.MOCK.resultAllies = JSON.stringify( allyData );
    allies = allyData;
    utils.dispatch("playersLoaded");
  }

  function onGotGameResultEnemies_Mock(players) {
    onGotGameResultEnemies( JSON.parse( players ) );
  }

  function onGotGameResultEnemies(enemyData) {
    enemies = enemyData;
    window.MOCK = window.MOCK || {};
    window.MOCK.resultEnemies = JSON.stringify( enemies );
	utils.dispatch("playersLoaded");
  }

  function addPlayers(){
    if (!accessedFromHistory){
      writeMatchData();
    }

    if ( gameMode == DataStore.RESULTS_MODE_TYPES.UNKNOWN || !enemies || !allies){ return; }
    var playerEl;
    if (gameMode === DataStore.RESULTS_MODE_TYPES.HORDE){
      var mostFrigateKills;
      for (var i = 0; i < allies.length; i++){
        if (!mostFrigateKills && allies[i].ComboStats && allies[i].ComboStats["frigates_destroyed"]){ 
          mostFrigateKills = allies[i]
        } else if (allies[i].ComboStats && allies[i].ComboStats["frigates_destroyed"] && (mostFrigateKills.ComboStats["frigates_destroyed"] < allies[i].ComboStats["frigates_destroyed"])) {
          mostFrigateKills = allies[i];
        }
      }

      if(mostFrigateKills){
        mostFrigateKills.IsFrigatesMVP = true;
      }
    }

    for (i = 0; i < allies.length; i++){
      playerEl = addPlayer(allies[i], true);
      playerEl.querySelector(".avatar").dataset.steamId = allies[i].SteamIdString;
      steamIdsToLoad.push(allies[i].SteamIdString);
    }
    markPlayersGroups(VIEW.el.querySelector('#players-allies'));

    if (gameMode !== DataStore.RESULTS_MODE_TYPES.HORDE){
      for (i = 0; i < enemies.length; i++){
        playerEl = addPlayer(enemies[i], false);
        playerEl.querySelector(".avatar").dataset.steamId = enemies[i].SteamIdString;
        steamIdsToLoad.push(enemies[i].SteamIdString);
      }
      markPlayersGroups(VIEW.el.querySelector('#players-enemies'));
    }

    playersAdded = true;

    if (!!/game=false/.test(window.location.href)) {
      //Get stats
      engine.call('GetPlayerCareerStats');
    }
    PlayersInfo.load(steamIdsToLoad, populateAvatars);
    setupBreakdownStatsScreen();
  }

  var TEMPLATE_MVP =
    '<div class="mvp-title">{{Title}}</div>' +
    '<div class="mvp-icon-wrapper">' +
      '<div class="mvp-fluff left {{Type}}"></div>' +
      `<img class="mvp-icon avatar" data-is-bot="{{IsBot}}" onerror="this.src='images/default-avatar.png'">` +
      '<div class="mvp-fluff right {{Type}}"></div>' +
    '</div>' +
    '<div class="mvp-name">{{Name}}</div>' +
    '<div class="mvp-value">{{Value}}</div>';

  function setMVP(player, isAlly, isHorde) {
    var isMvp = false;
    var mvpEls = [];
    var td, sp, cp;
    for (var i = 0; i < player.StatsAmount.length; i++) {
      var stat = player.StatsAmount[i];
      if (stat.StatName === "Takedowns") {
        td = stat.Amount;
      }
      else if (stat.StatName === "SupportPoints") {
        sp = stat.Amount;
      }
      else if (stat.StatName === "Captures") {
        cp = stat.Amount;
      }
    }

    if (player.IsTakedownsMVP) {
      mvpEls.push(TEMPLATE_MVP.format({
        'Title': (isHorde) ? utils.l10n.get("ResultsMVPCapitals") : utils.l10n.get("ResultsMVPTakedowns"),
        'Type': "takedowns",
        'IsBot':player.IsBot,
        'Name': player.Name,
        'Value': td
      },false));
      isMvp = true;
    }

    if (player.IsSupportPointsMVP) {
      mvpEls.push(TEMPLATE_MVP.format({
        'Title': utils.l10n.get("ResultsMVPSupport"),
        'Type': "support",
        'Name': player.Name,
        'IsBot':player.IsBot,
        'Value': sp
      },false));
      isMvp = true;
    }

    if (!isHorde) {
      if (player.IsCapturesMVP) {
        mvpEls.push(TEMPLATE_MVP.format({
          'Title': utils.l10n.get("ResultsMVPCaptures"),
          'Type': "captures",
          'IsBot':player.IsBot,
          'Name': player.Name,
          'Value': cp
        },false));
        isMvp = true;
      }
    } else {
      if (player.IsFrigatesMVP && player.ComboStats && player.ComboStats["frigates_destroyed"]) {
        mvpEls.push(TEMPLATE_MVP.format({
          'Title': utils.l10n.get("ResultsMVPFrigates"),
          'Type': "frigates",
          'IsBot':player.IsBot,
          'Name': player.Name,
          'Value': player.ComboStats["frigates_destroyed"]
        },false));
        isMvp = true;
      }
    }

    if (isMvp) {
      var mvpEl;
      var mvpGroup = VIEW.el.querySelector(".match-status .mvp-container");
      for (var i = 0; i < mvpEls.length; i++) {
        mvpEl = document.createElement("div");
        mvpEl.classList.add("mvp");
        mvpEl.dataset.isAlly = isAlly;
        mvpEl.innerHTML = mvpEls[i];
        if (player.PlayerId === MAIN_PLAYER.PlayerId) {
          mvpEl.classList.add("own-player");
        }
        mvpEl.querySelector(".mvp-icon").dataset.steamId = player.SteamIdString;
        mvpEl.querySelector(".mvp-icon").dataset.name = player.Name;
        mvpEl.querySelector(".mvp-icon").style.backgroundImage = "url('images/default-avatar.png')";

        mvpGroup.appendChild(mvpEl);
      }
    }
  }

  function markPlayersGroups(elList) {
    var elPlayers = elList.querySelectorAll('.player');
    var lastGroupPlayer = null;
    var currentGroup = '-1';
    var playersInGroup = {};

    for (var i = 0, len = elPlayers.length; i < len; i++) {
      var group = elPlayers[i].dataset.group;
      if (group === '-1') {
        continue;
      }

      playersInGroup[group] = (playersInGroup[group] || 0) + 1;

      if (group !== currentGroup) {
        elPlayers[i].classList.add('first-of-group');
        currentGroup = group;

        if (lastGroupPlayer) {
          lastGroupPlayer.classList.add('last-of-group');
        }
      }

      lastGroupPlayer = elPlayers[i];
    }

    if (lastGroupPlayer && !lastGroupPlayer.classList.contains('last-of-group')) {
      lastGroupPlayer.classList.add('last-of-group');
    }

    for (var i = 0, len = elPlayers.length; i < len; i++) {
      var group = elPlayers[i].dataset.group;
      if (group === '-1') {
        continue;
      }

      elPlayers[i].dataset.groupPlayers = playersInGroup[group];
    }

    updateTeamStats();
  }

  function updateTeamStats() {
    utils.updateScope({
      'teamAllies': teamAllies,
      'teamEnemies': teamEnemies
    }, VIEW);

    for (var k in teamAllies) {
      var allyValue = teamAllies[k];
      var enemyValue = teamEnemies[k];
      var elAllies = VIEW.el.querySelector('#players-allies .team .' + k.toLowerCase());
      var elEnemies = VIEW.el.querySelector('#players-enemies .team .' + k.toLowerCase());

      if (!elAllies || !elEnemies) {
        continue;
      }

      if (allyValue > enemyValue) {
        elAllies.classList.add('best');
        elEnemies.classList.remove('best');
      } else {
        elEnemies.classList.add('best');
        elAllies.classList.remove('best');
      }
    }
  }

  function getStat(player, name) {
    var stats = player.StatsAmount;

    for (var i = 0, len = stats.length, stat; i < len; i++) {
      stat = stats[i];

      if (stat.StatName === name) {
        return stat.Amount;
      }
    }

    return 0;
  }

  function addPlayer(player, isAlly) {
    PLAYERS[player.PlayerId] = player;

    if (isAlly) {
      statAllyIds.push(player.PlayerId);
    } else {
      statEnemyIds.push(player.PlayerId);
    }

    var team = isAlly ? teamAllies : teamEnemies;
    var stats = player.StatsAmount;
    for (var i = 0, len = stats.length; i < len; i++) {
      var k = stats[i].StatName;
      team[k] = (team[k] || 0) + stats[i].Amount;
    }

    PLAYERS[player.PlayerId].isAlly = isAlly;

    var el = document.createElement('div');
    var elParent = VIEW.el.querySelector('#players-' + (isAlly ? 'allies' : 'enemies'));

    el.classList.add('player');
    el.classList.add('table-row');
    el.dataset.playerId = player.PlayerId;

    player.RankProgress *= 100;

    team.mmr = (team.mmr || 0) + (player.MMR === -1 ? 0 : player.MMR);

    var isLocalPlayer = MAIN_PLAYER.PlayerId === player.PlayerId;

    if ( (isLocalPlayer && player.MMR > 0 && player.MMRMeanDelta > 0 ) || Player.IsDeveloper ) {
      el.dataset.mmr = parseInt( player.MMR + player.MMRMeanDelta );

      if ( player.MMRMeanDelta > 0 || Player.IsDeveloper ) {
        player.MMRMeanDelta = (player.MMRMeanDelta > 0 ? '+' : '') + parseInt( player.MMRMeanDelta );
        el.dataset.deltaMmr = player.MMRMeanDelta;
      }
    }

    el.dataset.group = player.MatchMakingGroupId;

    if (player.IsBot){
      player.CurrentRank = utils.random(5, 15);
    }

    player.Rank = RankManager.getRank(player.CurrentRank);

    VIEW.el.dataset.playerIsDev = false;
    if (Player.IsDeveloper) {
      VIEW.el.dataset.playerIsDev = true;
      if (player.IsBot) {
        player.Name += ' - ' + player.BotDifficulty;
      } else {
        player.Name += ' - ' + player.BotRating;
      }
    }

    el.innerHTML = TEMPLATE_PLAYER_ROW.format(player, true).format({
      'ShipManu': DataStore.getManufacturer(DataStore.getShip(player.ShipGUIDString).manufacturerId).shortName,
      'PlayerLevel': player.Rank,
      'Takedowns': getStat(player, 'Takedowns'),
      'Deaths': getStat(player, 'Deaths'),
      'SupportPoints': getStat(player, 'SupportPoints'),
      'Captures': getStat(player, 'Captures'),
      'LevelColour': isAlly ? 'DEFENCE' : 'ATTACK',
      'PlayerId': getStat(player, 'PlayerId'),
      'UserStatus': player.UserStatus,
      'IsDeveloper': player.IsDeveloper,
      'IsBot': player.isBot
    }, true);

    var badgeEl = el.querySelector(".badge");
    if (badgeEl && player.BadgeId){
      badgeEl.style.backgroundImage = 'url("/frontend/images/badges/' + player.BadgeId + '/small.png")';
      var badge = DataStore.getBadge(player.BadgeId);
      if (badge){ badgeEl.dataset.tooltip = DataStore.getBadgeTooltip(player.BadgeId); }
    }

    var avatar = el.querySelector(".avatar");
    avatar.setAttribute("src", 'images/default-avatar.png');
    avatar.dataset.isBot = !!player.IsBot;
    avatar.dataset.name = player.Name;

    el.querySelector('[data-add-friend]').classList.add('disabled');

    el.querySelector('[data-recommend]').addEventListener('click', function () {
      Navigation.show(Navigation.VIEWS.RECOMMEND_PLAYER, function onShow() {
        utils.dispatch('RecommendPlayer', [player, this]);
      }.bind(this));
    });

    el.querySelector('[data-report-player]').addEventListener('click', function () {

      Navigation.show(Navigation.VIEWS.REPORT_PLAYER, function onShow() {
        utils.dispatch('ReportPlayer', [player, this]);
      }.bind(this));

    });

    elParent.appendChild(el);
    setMVP(player, isAlly, gameMode === DataStore.RESULTS_MODE_TYPES.HORDE);
    return el;
  }

  function populateAvatars(){
    var scoreboardEls = VIEW.el.querySelectorAll(".avatar");
    var el = null;
    var usableCrewIds = CrewDB.getUsableCrewIDs();

    for (var i = 0; i < scoreboardEls.length; i++){
      el = scoreboardEls[i];
      if (el.dataset.steamId && (!el.dataset.isBot || el.dataset.isBot === "false")){
        el.setAttribute("src", PlayersInfo.get(el.dataset.steamId).avatarfull);
      } else if ( el.dataset.isBot === "true"){
        var entryId = usableCrewIds[ Math.floor( Math.randomWithSeed(el.dataset.name.hashString()) * usableCrewIds.length)];
        el.setAttribute("src",`/frontend/images/crew/${entryId}/profile-pic.png`);
      }
    }
  }

  function addFriendNotification(el, player) {
    // engine.call('HandleAddFriend', player.PlayerId);

    el.classList.add('disabled');

  }

  function getDuration(duration){
    var hours = 0;
    var minutes = Math.floor(duration / 60);
    var seconds = duration % 60;

    if (seconds < 10) {
      seconds = '0' + seconds;
    }

    hours = Math.floor(minutes / 60);
    minutes = minutes % 60;

    return (hours ? hours + ':' : '') + minutes + ':' + seconds;
  }

  function showMatchDuration(duration) {
    utils.updateScope({
      'DurationFormatted': getDuration(duration)
    }, VIEW);
  }

  function onGotMedals() {
    for (var i = 0; i < medals.medals.length; i++){
      var medal = medals.getMedal(medals.medals[i].id);
      var medalReward = null;

      if (!milestoneManager) {
        milestoneManager = new MilestoneManager({
          'el': VIEW.el.querySelector('.player-results .milestones')
        });
      }

      if (medal.wasCompleted || medal.stageIndexBefore < medal.stageIndexAfter){
        medalReward = medals.getPreviousMedalReward(medal.id);
        var unlockText = "";
        if (medal.isLastStandMedal && medal.groupID === medals.GROUP_TYPE.LastStandHighestWave){
          unlockText = utils.l10n.get("HighestWaveMilestone").format({
            "ShipName": medal.name,
            "WaveNum": medal.value
          });
        } else if (medal.hasRanks){
          if ( medal.isShipMedal ){
            unlockText = medal.name + ' ' + medal.stages[medal.stageIndexAfter].name;
          } else {
            unlockText = medal.name + ' ' + (medal.stageIndexAfter + 1);
          }
        } else {
          if ( medal.timesEarned > 1){
            unlockText = medal.name + ' x' + medal.timesEarned;
          } else 
          {
            unlockText = medal.name;
          }
        }

        var milestone = milestoneManager.addMilestone({
          'Title': medalReward.rewardText,
          'Source': 'medal',
          'overrideIcon': medal.image,
          'overrideImage': medal.image,
          'RewardType': medalReward.rewardType,
          'RewardItem': medalReward.rewardItem,
          'UnlockName': medalReward.rewardName,
          'UnlockText': unlockText,
          'Tooltip': medal.description,
          'MedalGroupId': medal.groupID
        });
      } else {
        //TODO: Add to progress screen. need code support
      }
    }
  }

  var LevelRewards = (function LevelRewards() {

    function LevelRewards(options) {
      this.el = null;
      this.rewards = [];
      this.currentView;
      this.nextView;

      this.init(options);
    }

    LevelRewards.prototype = Object.create(EventDispatcher.prototype);

    LevelRewards.prototype.init = function init(options) {
      console.info('Level Rewards init');
      this.el = options.el;
      this.rewards = options.rewards;
      this.startingLevel = options.startingLevel;

      this.render();

      utils.on('ShowLevelRewards', this.show.bind(this));
    };

    LevelRewards.prototype.onClick = function onClick(e) {
      var elClicked = e.target;

      if (elClicked.classList.contains('level-reward-button')) {
        if (audioPlaysAllowed) {
        }
        this.showNextReward();
      }
    };

    LevelRewards.prototype.render = function render() {

      console.info('Number of rewards to render = ' + this.rewards.length);

      for (var i = 0; this.rewards.length > i; i++) {

        if (i === 0) {
          this.currentView = i;
        } else if (i === 1) {
          this.nextView = i;
        }

        var reward = this.rewards[i];
        var rewardType = reward.Type;
        var rewardName = reward.Name;
        var rewardIds = reward.Rewards;
        var keys = Object.keys(rewardIds);
        var unlockText = utils.l10n.get('ResultsRewardRankAchieved').format({
          'Rank': RankManager.getRankByXP(matchResultXP.XPAfter).Rank
        });
        var rewardText = '';
        var overrideImage = '';

        switch (rewardType) {
          case "Implants":
            rewardText = utils.l10n.get("ImplantPodReward");
            // There are 5 ids in the rewards create
            rewardIds.length = 1;
            keys.length = 1;
            break;
          case "HC":
            rewardText = utils.l10n.get("PlatinumReward").format(reward.Rewards[0]);
            break;
          case "Credits":
            rewardText = utils.l10n.get("CreditsReward").format(reward.Rewards[0]);
            break;
          case "CrewPod":
            rewardText = utils.l10n.get("CrewReward");
            break;
          case "Generic":
          case "DropPod":
            rewardText = utils.l10n.get("DropReward");
            break;
          case "Ship":
            rewardText = utils.l10n.get("ShipReward").format();
            overrideImage = 'images/ships/{{Id}}/large.png';
            rewardIds.length = 1;
            keys.length = 1;
            break;
          case "Skin":
            rewardText = utils.l10n.get("ShipSkinReward").format();
            overrideImage = 'views/packopen/images/skins/card-skin-acidthunder.png';
            break;
        }

        console.info(rewardName + ' has been rendered');

        this.startingLevel++;
        if (!milestoneManager) {
          milestoneManager = new MilestoneManager({
            'el': VIEW.el.querySelector('.player-results .milestones')
          });
        }
        milestoneManager.addMilestone({
          'Title': utils.l10n.get("RankUp"),
          'overrideImage': overrideImage,
          'Source': 'rank',
          'RewardType': rewardType,
          'UnlockText': unlockText,
          'UnlockName': rewardText
        });
      }
    };

    LevelRewards.prototype.show = function show() {
      utils.dispatch('LevelRewardsShown');
      this.hide();
    };

    LevelRewards.prototype.hide = function hide() {
      utils.dispatch('LevelRewardsHidden');
    };

    LevelRewards.prototype.showNextReward = function showNextReward() {
      var currentContainer = this.el.querySelector('.reward-' + this.currentView);
      var nextContainer = this.el.querySelector('.reward-' + this.nextView);

      if (nextContainer) {
        currentContainer.classList.remove('shown');
        nextContainer.classList.add('shown');
        this.currentView++;
        this.nextView++;
      } else {
        this.hide();
      }
    };

    return LevelRewards;
  })();

  var ProgressManager = (function ProgressManager() {
    var TEMPLATE = 
      '<div class="title">{{Title}}</div>' +
      '<div class="image"></div>' +
      '<div class="footer progress">' +
        '<div class="bar">' +
          '<span class="before"></span>' +
          '<span class="earned"></span>' +
        '</div>' +
      '</div>';

    function ProgressManager(options){
      this.el;
      this.progressedItems = [];
      if (options){
        this.init(options);
      }
    };

    ProgressManager.prototype.init = function init(options){
      this.el = options.el;
      this.progressWrapperEl = this.el.querySelector(".progress-wrapper");
    };

    ProgressManager.prototype.addProgress = function addProgress(progress){
      var progressEl = document.createElement('div');
      progressEl.classList.add("progress-item");
      progressEl.innerHTML = TEMPLATE.format(progress, false);
      progressEl.querySelector(".image").style.backgroundImage = "url('" + progress.Image + "')";
      if (progress.total){
        var beforePercent = Math.floor((progress.before / progress.total) * 100);
        var earnedPercent = Math.floor((progress.earned / progress.total) * 100);
        progressEl.querySelector(".before").style.width = beforePercent + "%";
        progressEl.querySelector(".earned").style.width = earnedPercent + "%";
      } else {
        progressEl.querySelector(".bar").style.display = "none";
      }

      this.el.appendChild(progressEl);
    };
    return ProgressManager;
  })();

  var BoosterManager = (function BoosterManager() {
    var TEMPLATE_BOOSTER = 
      '<div class="booster type-{{BoosterType}} status-{{HighestAllyStatus}} founder{{FounderStatus}}"' +
        'data-tooltip="{{Tooltip}}" ' +
        'data-tooltip-align="bottom center" ' +
        'data-xp-modifier="{{ModifierXP}}" ' +
        'data-sc-modifier="{{ModifierSC}}" ' +
        'data-audio-hover>' +
          '<div class="image"></div>' +
          '<div class="details">' +
            '<div class="name">{{BoosterName}}</div>' +
            '<div class="info">' +
              '<div class="xp value">{{(f)ValueXP}}<b>XP</b></div>' +
              '<div class="sc value defence-color">{{(f)ValueSC}}<b>C</b></div>' +
          '</div>' +
        '</div>' +
      '</div>';

    var BOOSTER_TYPES = {
      Playing: 1,
      PresencePersonal: 2,
      PresenceAlly: 3,
      UltimateSkinBooster: 4,
      VictoryBooster: 5,
      SpecialBooster: 6,
      FirstWinBooster: 7,
      TimedBooster: 8,
      DoubleEarningsBooster: 9,
      QueueCreditsBooster: 10,
      RewardBonusBooster: 20
    };

    var BOOSTER_NAMES = {};
    BOOSTER_NAMES[BOOSTER_TYPES.Playing] = utils.l10n.get('BoosterNamePlaying');
    BOOSTER_NAMES[BOOSTER_TYPES.PresencePersonal] = utils.l10n.get('BoosterNameFounderBooster');
    BOOSTER_NAMES[BOOSTER_TYPES.PresenceAlly] = utils.l10n.get('BoosterNamePresenceBooster');
    BOOSTER_NAMES[BOOSTER_TYPES.UltimateSkinBooster] = utils.l10n.get('BoosterNameUltimateSkin');
    BOOSTER_NAMES[BOOSTER_TYPES.VictoryBooster] = utils.l10n.get('ResultsVictory');
    BOOSTER_NAMES[BOOSTER_TYPES.SpecialBooster] = utils.l10n.get('BoosterNameSpecial');
    BOOSTER_NAMES[BOOSTER_TYPES.FirstWinBooster] = utils.l10n.get('BoosterNameFirstWin');
    BOOSTER_NAMES[BOOSTER_TYPES.TimedBooster] = utils.l10n.get('BoosterNameTimedBooster');
    BOOSTER_NAMES[BOOSTER_TYPES.DoubleEarningsBooster] = utils.l10n.get('BoosterNameDoubleEarnings');
    BOOSTER_NAMES[BOOSTER_TYPES.QueueCreditsBooster] = utils.l10n.get('BoosterNameQueueReward');

    var BOOSTER_TOOLTIPS = {};
    BOOSTER_TOOLTIPS[BOOSTER_TYPES.Playing] = '';
    BOOSTER_TOOLTIPS[BOOSTER_TYPES.PresencePersonal] = 'l10n(FounderRank{{FounderStatus}})';
    BOOSTER_TOOLTIPS[BOOSTER_TYPES.PresenceAlly] = 'l10n(FounderRank{{HighestAllyStatus}}) from:{{PresencePlayers}}';
    BOOSTER_TOOLTIPS[BOOSTER_TYPES.UltimateSkinBooster] = 'l10n(BoosterTooltipUltimateSkin) {{currentShip.name}}';
    BOOSTER_TOOLTIPS[BOOSTER_TYPES.VictoryBooster] = 'l10n(BoosterTooltipVictory)';
    BOOSTER_TOOLTIPS[BOOSTER_TYPES.SpecialBooster] = '';
    BOOSTER_TOOLTIPS[BOOSTER_TYPES.FirstWinBooster] = 'l10n(BoosterTooltipFirstWin)';
    BOOSTER_TOOLTIPS[BOOSTER_TYPES.TimedBooster] = '';
    BOOSTER_TOOLTIPS[BOOSTER_TYPES.DoubleEarningsBooster] = 'l10n(BoosterTooltipDoubleEarnings)';
    BOOSTER_TOOLTIPS[BOOSTER_TYPES.QueueCreditsBooster] = 'l10n(BoosterTooltipQueueReward)';

    function BoosterManager(options) {
      this.el;
      this.elBoosters;
      this.boosters;
      this.onDone;

      this.timeoutNext;
      this.indexBoosterToShow = 0;

      if (options) {
        this.init(options);
      }
    }

    BoosterManager.prototype.init = function init(options) {
      this.el = options.el;
      this.boosters = options.boosters.slice(0);
      this.onDone = options.onDone || function () { };

      this.el.addEventListener('webkitTransitionEnd', this.onBoosterShown.bind(this));

      this.createHTML();
    };

    BoosterManager.prototype.start = function start() {
      this.indexBoosterToShow = 0;
      setTimeout(
        this.showNextBooster.bind(this), 100);
    };

    BoosterManager.prototype.skip = function skip() {
      window.clearTimeout(this.timeoutNext);
      var elBoosters = this.el.querySelectorAll('.booster:not(.visible)');
      for (var i = 0, len = elBoosters.length; i < len; i++) {
        elBoosters[i].classList.add('visible');
      }
    };

    BoosterManager.prototype.showNextBooster = function showNextBooster() {
      var elBooster = this.elBoosters[this.indexBoosterToShow];
      if (!elBooster) {
        this.onDone();
        return;
      }

      if (audioPlaysAllowed) {
        AudioPlayer.play(AudioPlayer.Results_BoosterAppear);
      }

      elBooster.classList.add('visible');
    };

    BoosterManager.prototype.onBoosterShown = function onBoosterShown() {
      this.indexBoosterToShow++;
      var booster = this.boosters[this.indexBoosterToShow];
      if (booster) {
        this.showNextBooster();
      }
      else {
        this.onDone();
      }
    };

    BoosterManager.prototype.createHTML = function createHTML() {
      var html = '';

      for (var i = 0, len = this.boosters.length, booster; i < len; i++) {
        booster = this.boosters[i];
        
        booster.currentShip = DataStore.getShip(Player.getShip());

        if (!('FounderStatus' in booster)) {
          booster.FounderStatus = MAIN_PLAYER.UserStatus;
        }

        var playerNames = [];
        if (booster.AlliesShipId) {
          for (var j = 0, len2 = booster.AlliesShipId.length, playerId; j < len2; j++) {
            playerId = booster.AlliesShipId[j];

            playerNames.push(((PLAYERS[playerId] || {}).Name || '').sanitise());
          }
        }
        booster.PresencePlayers = '<br />' + playerNames.join('<br />').replace(/&/, '&amp;');

        let xpModifier = booster.ModifierXP;
        let scModifier = booster.ModifierSC;

        if (booster.BoosterType === BOOSTER_TYPES.DoubleEarningsBooster && DataStore.isRewardBonusActive()) {

          let rewardBonus = DataStore.getRewardBonus();
          if (rewardBonus && rewardBonus.gameMode === subGameMode) {

            booster.BoosterType = BOOSTER_TYPES.RewardBonusBooster;

            if (rewardBonus.xpBonus) {

              booster.BoosterName = 'x' + (rewardBonus.xpBonus + 1) + ' ' + utils.l10n.get('GenericLabelXPFull');
              booster.Tooltip = utils.l10n.get('BonusRewardXP');

            } else if (rewardBonus.scBonus) {

              booster.BoosterName = 'x' + (rewardBonus.scBonus + 1) + ' ' + utils.l10n.get('GenericLabelSC');
              booster.Tooltip = utils.l10n.get('BonusRewardSC');
              
            }

            xpModifier = rewardBonus.xpBonus;
            scModifier = rewardBonus.scBonus;
          }
        } else {
          if (!booster.BoosterName) {
            booster.BoosterName = BOOSTER_NAMES[booster.BoosterType] || '';
          }

          if (!booster.Tooltip) {
            booster.Tooltip = (BOOSTER_TOOLTIPS[booster.BoosterType] || '').format(booster);
          }
        }

        booster.ModifierXPPercentage = Math.round(xpModifier * 100);
        booster.ModifierSCPercentage = Math.round(scModifier * 100);

        html += TEMPLATE_BOOSTER.format(booster);
      }

      this.elBoosters = this.el.children;
      this.el.innerHTML = html;
    };

    return BoosterManager;
  }());

  utils.l10n.whenReady(init);
}());

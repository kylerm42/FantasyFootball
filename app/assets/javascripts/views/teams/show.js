FantasyFootball.Views.TeamShow = Backbone.CompositeView.extend({
  initialize: function (options) {
    this.listenTo(this.model, 'sync', this.render);
    this.listenTo(this.collection, 'add', this.addRosterRow);
    this.listenTo(this.collection, 'remove', this.removeRosterRow);
    this.listenTo(this.collection, 'sync', this.addRosterRows);
    this.model.rosterSpots().each(this.addRosterRow.bind(this))
  },

  template: JST['teams/show'],

  events: {
    "sort": "setPlaceholder",
    "click .drop-player": "dropPlayer",
    'click .trade-sent-btn': 'sentTradeOpen',
    'click .trade-received-btn': 'receivedTradeOpen'
  },

  render: function () {
    console.log('rendering team show')
    var renderedContent = this.template({ team: this.model });
    this.$el.html(renderedContent);
    this.renderSubviews();

    // for keeping row width when dragging
    var fixHelper = function(e, ui) {
    	ui.children().each(function() {
    		$(this).width($(this).width());
    		$(this).height($(this).height());
    	});
    	return ui;
    };

    $("tbody").sortable({
      containment: 'parent',
      distance: 10,
      revert: 150,
      opacity: 0.7,
      helper: fixHelper,
      forcePlaceholderSize: true,
      tolerance: 'pointer'
    });

    return this;
  },

  addRosterRow: function (rosterSpot) {
    var rosterRowView = new FantasyFootball.Views.RosterRow({
      model: rosterSpot,
      team: this.model
    });
    this.addSubview('tbody', rosterRowView);
    rosterRowView.render();
  },

  addRosterRows: function (rosterSpots) {
    var view = this;
    rosterSpots.forEach(function (rosterSpot) {
      view.addRosterRow(rosterSpot);
    })
  },

  removeRosterRow: function (rosterSpot) {
    var rosterRowView = _(this.subviews()["tbody"]).find(function (subview) {
      return subview.model == rosterSpot;
    });

    this.removeSubview("tbody", rosterRowView);
  },

  dropPlayer: function (event) {
    var $currentTarget = $(event.currentTarget);
    this.droppedPlayerId = $(event.currentTarget).data('id');
    var droppedPlayerName = $currentTarget.data('name');

    var $confirm = $('<button>').addClass('btn btn-danger pull-right drop-confirm')
                                .attr('id', 'drop-' + this.droppedPlayerId)
                                .attr('data-id', this.droppedPlayerId)
                                .text('Confirm');
    var $cancel = $('<button>').addClass('btn btn-default drop-cancel')
                               .attr('data-id', this.droppedPlayerId)
                               .text('Cancel');
    var $buttons = $('<div>').append($cancel).append($confirm);
    $(event.currentTarget).popover({
      html: true,
      title: "Are you sure you want to drop " + droppedPlayerName + "?",
      content: $buttons,
      trigger: 'manual'
    });

    $currentTarget.popover('toggle');

    $('.drop-cancel').on('click', this.dropCancel.bind(this));
    $('.drop-confirm').on('click', this.dropConfirm.bind(this))
  },

  dropConfirm: function (event) {
    console.log('confirming drop')
    var $currentTarget = $(event.currentTarget);
    $currentTarget.attr('disabled', 'disabled').text('Dropping...');
    var playerId = $currentTarget.data('id');

    var addDrop = new FantasyFootball.Models.AddDrop({
      dropped_player_id: playerId,
      team_id: this.model.id
    })

    addDrop.save({}, {
      success: function (resp) {
        $('.drop-player').popover('hide')
        $('#player-' + playerId).remove();
      }
    });
  },

  dropCancel: function (event) {
    var popoverId = $(event.currentTarget).data('id')
    $('#drop-' + popoverId).popover('hide')
  },

  sentTradeOpen: function (event) {
    var $currentTarget = $(event.currentTarget);
    this.openTrade = this.model.sentTrades().get($currentTarget.data('id'));

    var tradeSentModalView = new FantasyFootball.Views.TeamTradeSentModal({
      model: this.openTrade
    });

    $('#trade-modal .modal-content').html(tradeSentModalView.render().$el);

    $('.confirm-btn').off();
    $('.confirm-btn').on('click', this.sentTradeCancel.bind(this));
  },

  sentTradeCancel: function (event) {
    var view = this;
    $('.confirm-btn').attr('disabled', 'disabled').text("Cancelling...");

    this.openTrade.destroy({
      success: function () {
        $('#trade-modal').modal('hide');
        view.model.sentTrades().remove(view.openTrade);
        $('.trade-sent-btn[data-id="' + view.openTrade.id + '"').parent()
                                                                .alert('close')
      }
    });
  },

  receivedTradeOpen: function (event) {
    var $currentTarget = $(event.currentTarget);
    this.openTrade = this.model.receivedTrades().get($currentTarget.data('id'));

    var tradeReceivedModalView = new FantasyFootball.Views.TeamTradeReceivedModal({
      model: this.openTrade
    });

    $('#trade-modal .modal-content').html(tradeReceivedModalView.render().$el);

    $('.accept-btn').off();
    $('.accept-btn').on('click', this.receivedTradeAccept.bind(this));
    $('.deny-btn').off();
    $('.deny-btn').on('click', this.receivedTradeDeny.bind(this));
  },

  receivedTradeAccept: function (event) {
    $('.deny-btn').attr('disabled', 'disabled');
    $('.accept-btn').attr('disabled', 'disabled').text("Accepting...");
    this.openTrade.set('status', 'accepted');
    this.openTrade.save({}, {
      success: function () {
        console.log('success');
        $('#trade-modal').modal('hide');
      }
    });
  },

  receivedTradeDeny: function (event) {
    var view = this;
    $('.deny-btn').attr('disabled', 'disabled').text("Cancelling...");

    this.openTrade.destroy({
      success: function () {
        $('#trade-modal').modal('hide');
        view.model.receivedTrades().remove(view.openTrade);
        $('.trade-received-btn[data-id="' + view.openTrade.id + '"').parent()
                                                                .alert('close')
      }
    });
  },

  setPlaceholder: function (event, ui) {
    $('.ui-sortable-placeholder').height('55px')
  }
});

FantasyFootball.Views.RosterRow = Backbone.View.extend({
  initialize: function (options) {
    this.model = options.model;
    this.team = options.team;
  },

  tagName: 'tr',
  template: JST['teams/roster_row'],

  render: function () {
    var renderedContent = this.template({
      position: this.model.get('position'),
      player: this.model.player,
      team: this.team
    });

    this.$el.addClass('full-width').attr('id', 'player-' + this.model.player.id).html(renderedContent);
    return this;
  }
})
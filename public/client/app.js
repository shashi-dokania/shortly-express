window.Shortly = Backbone.View.extend({
  template: Templates['layout'],

  events: {
    'click li a.index':  'renderIndexView',
    'click li a.create': 'renderCreateView',
    'click li a.logout': 'sendLogoutRequest'
  },

  initialize: function(){
    console.log( 'Shortly is running' );
    $('body').append(this.render().el);

    this.router = new Shortly.Router({ el: this.$el.find('#container') });
    this.router.on('route', this.updateNav, this);

    Backbone.history.start({ pushState: true });
  },

  render: function(){
    this.$el.html( this.template() );
    return this;
  },

  renderIndexView: function(e){
    e && e.preventDefault();
    this.router.navigate('/', { trigger: true });
  },

  renderCreateView: function(e){
    e && e.preventDefault();
    this.router.navigate('/create', { trigger: true });
  },

  sendLogoutRequest: function(){
    // this.router.navigate('/login', { trigger: true });
    // $.ajax({
    //   type: 'POST',
    //   url: '/logout',
    //   // contentType: 'application/x-www-form-urlencoded',
    //   success: function(data) {
    //     //console.log(data);
    //     console.log('Successfully logged out');
    //     location.reload();
    //   },
    //   error: function(err){
    //     console.log('Error logging out: ', err);
    //   }
    // });
  },

  updateNav: function(routeName){
    this.$el.find('.navigation li a')
      .removeClass('selected')
      .filter('.' + routeName)
      .addClass('selected');
  }
});

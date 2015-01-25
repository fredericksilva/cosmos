describe("Cosmos.Router", function() {

  var jsdom = require('jsdom');

  // jsdom creates a fresh new window object for every test case and React needs
  // to be required *after* the window and document globals are available. The
  // var references however must be declared globally in order to be accessible
  // in test cases as well.
  var React,
      utils,
      Cosmos,
      ComponentClass,
      componentElement,
      componentInstance,
      componentCallback;

  beforeEach(function() {
    global.window = jsdom.jsdom().createWindow('<html><body></body></html>');
    global.document = global.window.document;
    global.navigator = global.window.navigator;

    React = require('react/addons');
    utils = React.addons.TestUtils;
    Cosmos = require('../build/cosmos.js');

    // Ignore native APIs
    spyOn(Cosmos.Router.prototype, '_bindPopStateEvent');
    spyOn(Cosmos.Router.prototype, '_replaceHistoryState');
    spyOn(Cosmos.Router.prototype, '_pushHistoryState');

    // The Cosmos.url lib is already tested in isolation
    spyOn(Cosmos.url, 'getParams').and.returnValue({
      component: 'List',
      dataUrl: 'users.json'
    });
    spyOn(Cosmos.url, 'isPushStateSupported').and.returnValue(true);

    // We just want a valid instance to work with, the Router props won't be
    // taken into consideration
    spyOn(Cosmos, 'render').and.callFake(function(props, container, callback) {
      componentCallback = callback;
      return componentInstance;
    });

    // Clean up previous component setups
    ComponentClass = null;
    componentElement = null;
    componentInstance = null;
  });

  describe("new instance", function() {

    it("should use props from URL query string", function() {
      var router = new Cosmos.Router();

      var propsSent = Cosmos.render.calls.mostRecent().args[0];
      expect(propsSent.component).toEqual('List');
      expect(propsSent.dataUrl).toEqual('users.json');
    });

    it("should extend default props", function() {
      var router = new Cosmos.Router({
        component: 'DefaultComponent',
        defaultProp: true
      });

      var propsSent = Cosmos.render.calls.mostRecent().args[0];
      expect(propsSent.component).toEqual('List');
      expect(propsSent.dataUrl).toEqual('users.json');
      expect(propsSent.defaultProp).toEqual(true);
    });

    it("should attach router reference to props", function() {
      var router = new Cosmos.Router();

      var propsSent = Cosmos.render.calls.mostRecent().args[0];
      expect(propsSent.router).toEqual(router);
    });

    it("should default to document.body as container", function() {
      var router = new Cosmos.Router();

      expect(Cosmos.render.calls.mostRecent().args[1]).toBe(document.body);
    });
  });

  describe(".goTo method", function() {

    it("should use props param", function() {
      var router = new Cosmos.Router();
      router.goTo('?component=List&dataUrl=users.json');

      var propsSent = Cosmos.render.calls.mostRecent().args[0];
      expect(propsSent.component).toEqual('List');
      expect(propsSent.dataUrl).toEqual('users.json');
    });

    it("should extend default props", function() {
      var router = new Cosmos.Router({
        component: 'DefaultComponent',
        defaultProp: true
      });
      router.goTo('?component=List&dataUrl=users.json');

      var propsSent = Cosmos.render.calls.mostRecent().args[0];
      expect(propsSent.component).toEqual('List');
      expect(propsSent.dataUrl).toEqual('users.json');
      expect(propsSent.defaultProp).toEqual(true);
    });

    it("should attach router reference to props", function() {
      var router = new Cosmos.Router();
      router.goTo('?component=List&dataUrl=users.json');

      var propsSent = Cosmos.render.calls.mostRecent().args[0];
      expect(propsSent.router).toEqual(router);
    });

    it("should push component snapshot to browser history", function() {
      ComponentClass = React.createClass({
        mixins: [Cosmos.mixins.PersistState],
        render: function() {
          return React.DOM.span();
        }
      });
      componentElement = React.createElement(ComponentClass);
      componentInstance = utils.renderIntoDocument(componentElement);

      // Simulate some state addition in the component
      spyOn(componentInstance, 'generateSnapshot').and.callFake(function() {
        return {
          component: 'List',
          dataUrl: 'users.json',
          state: {
            haveISeenThings: 'yes'
          }
        };
      });

      var router = new Cosmos.Router();
      router.goTo('?component=List&dataUrl=users.json');

      // Simulate React.render callback call
      componentCallback.call(componentInstance);

      // The snapshot should've been extracted from the component
      expect(componentInstance.generateSnapshot).toHaveBeenCalled();

      // It's a bit difficult to mock the native functions so we mocked the
      // private methods that wrap those calls
      expect(router._pushHistoryState.calls.mostRecent().args[0]).toEqual({
        component: 'List',
        dataUrl: 'users.json',
        state: {
          haveISeenThings: 'yes'
        }
      });
    });

    it("should update browser history for previous component", function() {
      /* Note: This is not a pure unit test, it depends on the internal logic
      of React components */
      ComponentClass = React.createClass({
        mixins: [Cosmos.mixins.PersistState],
        render: function() {
          return React.DOM.span();
        }
      });
      componentElement = React.createElement(ComponentClass, {
        component: 'List',
        dataUrl: 'users.json'
      });
      componentInstance = utils.renderIntoDocument(componentElement);

      var router = new Cosmos.Router();
      // We alter the current instance while it's bound to the current history
      // entry
      componentInstance.setProps({dataUrl: null, someNumber: 555});
      componentInstance.setState({amIState: true});

      // Before routing to a new Component configuration, the previous one
      // shouldn't been updated with our changes
      router.goTo('?component=User&dataUrl=user.json');

      // It's a bit difficult to mock the native functions so we mocked the
      // private methods that wrap those calls
      expect(router._replaceHistoryState.calls.mostRecent().args[0]).toEqual({
        component: 'List',
        dataUrl: null,
        someNumber: 555,
        state: {
          amIState: true
        }
      });
    });
  });

  describe(".PopState event", function() {

    it("should use props from event state", function() {
      var router = new Cosmos.Router();
      router.onPopState({
        state: {
          component: 'List',
          dataUrl: 'users.json'
        }
      });

      var propsSent = Cosmos.render.calls.mostRecent().args[0];
      expect(propsSent.component).toEqual('List');
      expect(propsSent.dataUrl).toEqual('users.json');
    });

    it("shouldn't extend default props", function() {
      var router = new Cosmos.Router({
        component: 'DefaultComponent',
        defaultProp: true
      });
      router.onPopState({
        state: {
          component: 'List',
          dataUrl: 'users.json'
        }
      });

      var propsSent = Cosmos.render.calls.mostRecent().args[0];
      expect(propsSent.component).toEqual('List');
      expect(propsSent.dataUrl).toEqual('users.json');
      expect(propsSent.defaultProp).toEqual(undefined);
    });

    it("should attach router reference to props", function() {
      var router = new Cosmos.Router();
      router.onPopState({
        state: {
          component: 'List',
          dataUrl: 'users.json'
        }
      });

      var propsSent = Cosmos.render.calls.mostRecent().args[0];
      expect(propsSent.router).toEqual(router);
    });
  });
});

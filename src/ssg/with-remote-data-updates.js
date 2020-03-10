const React = require('react');
const { withRouter } = require('next/router');


module.exports.withRemoteDataUpdates = function withRemoteDataUpdates(WrappedComponent, { wsPort = '8088' } = {}) {

    class Component extends React.Component {

        componentDidMount() {
            if (!this.props.liveUpdateOnRemoteDataChange) {
                return;
            }
            // console.log('withSSGPage componentDidMount', this.props);
            const wsPort = this.props.liveUpdateWsPort;
            this.ws = new WebSocket('ws://localhost:' + wsPort);
            this.ws.addEventListener('open', (event) => {
                // console.log('initial-props websocket opened');
            });
            this.ws.addEventListener('message', (event) => {
                // console.log('initial-props websocket received message:', event);
                if (event.data === 'propsChanged') {
                    this.props.router.replace(this.props.router.pathname, this.props.router.asPath);
                }
            });
            this.ws.addEventListener('close', (event) => {
                // console.log('initial-props websocket closed', event);
            });
            this.ws.addEventListener('error', (event) => {
                // console.log('initial-props websocket received an error', event);
            });
        }

        componentWillUnmount() {
            if (!this.props.liveUpdateOnRemoteDataChange) {
                return;
            }
            // console.log('withSSGPage componentWillUnmount');
            if (this.ws) {
                this.ws.close();
            }
        }

        render() {
            // console.log('withSSGPage render', this.props);
            return <WrappedComponent {...this.props} />;
        }
    }

    function getDisplayName(WrappedComponent) {
        return WrappedComponent.displayName || WrappedComponent.name || 'Component';
    }

    Component.displayName = `WithRemoteDataUpdates(${getDisplayName(WrappedComponent)})`;

    return withRouter(Component);
};
// @flow

import React from 'react';
import { BackHandler, NativeModules, SafeAreaView, StatusBar, View , DeviceEventEmitter} from 'react-native';
import { withSafeAreaInsets } from 'react-native-safe-area-context';

import { appNavigate } from '../../../app/actions';
import { FULLSCREEN_ENABLED, PIP_ENABLED } from '../../../base/flags/constants';

import Container from '../../../base/react/components/native/Container';
import LoadingIndicator from '../../../base/react/components/native/LoadingIndicator';
import TintedView from '../../../base/react/components/native/TintedView';


import { connect } from 'react-redux';
import { ASPECT_RATIO_NARROW } from '../../../base/responsive-ui/constants';
import { isCalendarEnabled } from '../../../calendar-sync/functions.native';

import { DisplayNameLabel } from '../../../display-name';
import Filmstrip from '../../../filmstrip/components/native/Filmstrip';
import TileView from '../../../filmstrip/components/native/TileView';
import { FILMSTRIP_SIZE } from '../../../filmstrip/constants';
import { isFilmstripVisible } from '../../../filmstrip/functions.native';
import {
    getParticipants,getParticipantCountRemoteOnly
} from '../../../base/participants/functions';
import LargeVideo from '../../../large-video/components/LargeVideo.native';
import { KnockingParticipantList } from '../../../lobby/components/native';
import { getIsLobbyVisible } from '../../../lobby/functions';
import { navigate }
    from '../../../mobile/navigation/components/conference/ConferenceNavigationContainerRef';
import { screen } from '../../../mobile/navigation/routes';
import { Captions } from '../../../subtitles';
import { setToolboxVisible } from '../../../toolbox/actions';
import { Toolbox } from '../../../toolbox/components/native';
import { isToolboxVisible } from '../../../toolbox/functions';
import {
    AbstractConference,
    abstractMapStateToProps
} from '../AbstractConference';
import type { AbstractProps } from '../AbstractConference';
import { isConnecting } from '../functions';

import AlwaysOnLabels from './AlwaysOnLabels';
import ExpandedLabelPopup from './ExpandedLabelPopup';
import LonelyMeetingExperience from './LonelyMeetingExperience';
import TitleBar from './TitleBar';
import { EXPANDED_LABEL_TIMEOUT } from './constants';
import styles from './styles';


import CustomisedToolBox from './CustomisedToolBox';
import { AddPeopleDialog, CalleeInfoContainer } from '../../../invite';
import AudioScreen from './AudioScreen';
import UpperTextContainer from './UpperTextContainer';
import CalleeDetails from './CalleeDetails';
import { Chat } from '../../../chat';
import ConferenceOld from './Conferenceold';
import { getFeatureFlag } from '../../../base/flags/functions';


var totalUser = '0';

/**
 * The type of the React {@code Component} props of {@link Conference}.
 */
type Props = AbstractProps & {

    /**
     * Application's aspect ratio.
     */
    _aspectRatio: Symbol,

    /**
     * Wherther the calendar feature is enabled or not.
     */
    _calendarEnabled: boolean,

    /**
     * The indicator which determines that we are still connecting to the
     * conference which includes establishing the XMPP connection and then
     * joining the room. If truthy, then an activity/loading indicator will be
     * rendered.
     */
    _connecting: boolean,

    /**
     * Set to {@code true} when the filmstrip is currently visible.
     */
    _filmstripVisible: boolean,

    /**
     * The indicator which determines whether fullscreen (immersive) mode is enabled.
     */
    _fullscreenEnabled: boolean,

    /**
     * The indicator which determines if the conference type is one to one.
     */
    _isOneToOneConference: boolean,

    /**
     * The indicator which determines if the participants pane is open.
     */
    _isParticipantsPaneOpen: boolean,

    /**
     * The ID of the participant currently on stage (if any).
     */
    _largeVideoParticipantId: string,

    /**
     * Whether Picture-in-Picture is enabled.
     */
    _pictureInPictureEnabled: boolean,

    /**
     * The indicator which determines whether the UI is reduced (to accommodate
     * smaller display areas).
     */
    _reducedUI: boolean,

    /**
     * The indicator which determines whether the Toolbox is visible.
     */
    _toolboxVisible: boolean,

    /**
     * Indicates whether the lobby screen should be visible.
     */
    _showLobby: boolean,

    /**
     * The redux {@code dispatch} function.
     */
    dispatch: Function,

    /**
    * Object containing the safe area insets.
    */
    insets: Object
};
const { JSCommunicateComponent, AudioMode, OpenMelpChat } = NativeModules;

/**
 *  Function which says if platform is iOS or not.
 *
 */
 function isPlatformiOS(): boolean {
    return Platform.OS === 'ios';
}
type State = {

    /**
     * The label that is currently expanded.
     */
    visibleExpandedLabel: ?string
}

/**
 * The conference page of the mobile (i.e. React Native) application.
 */
class Conference extends AbstractConference<Props, State> {
    /**
     * Timeout ref.
     */
    _expandedLabelTimeout: Object;


    intervalObj;
    nativeEventEmitter;
    subscriptionStartTimer;
    subscriptionStopTimer;
    subscriptionConnectionStatus;
    subscriptionviewcalldata;

    /**
     * Initializes a new Conference instance.
     *
     * @param {Object} props - The read-only properties with which the new
     * instance is to be initialized.
     */
    constructor(props) {
        super(props);

        this.state = {
            visibleExpandedLabel: undefined
        };

        this._expandedLabelTimeout = React.createRef();

        // Bind event handlers so they are only bound once per instance.
        this._onClick = this._onClick.bind(this);
        this._onHardwareBackPress = this._onHardwareBackPress.bind(this);
        this._setToolboxVisible = this._setToolboxVisible.bind(this);
        this._createOnPress = this._createOnPress.bind(this);
        this.state = { interval: 0, speakerOn: false, showAttendees:false, connectionStatus: '' };
        this.secondsToHMS.bind(this);
        this._startTimer =  this._startTimer.bind(this);
        this._stopTimer =  this._stopTimer.bind(this);
        this._connectionStatus = this._connectionStatus.bind(this);
        this._setSpeakerState = this._setSpeakerState.bind(this);
        this.showAttendees =  this.showAttendees.bind(this);
        if (isPlatformiOS()) {
            this.nativeEventEmitter = new NativeEventEmitter(JSCommunicateComponent);
        }
        const { audioOnly} = this.props;
      //  console.log("Audio Only--->",this.props);
        if(audioOnly){
            AudioMode.setAudioDevice("EARPIECE");
            console.log("Audio Only---constructor>","EARPIECE");
        }else{
            AudioMode.setAudioDevice("SPEAKER");
        }
    }

    /**
     * Implements {@link Component#componentDidMount()}. Invoked immediately
     * after this component is mounted.
     *
     * @inheritdoc
     * @returns {void}
     */
    componentDidMount() {

        let eventEmitter;

        if (isPlatformiOS() && this.nativeEventEmitter) {
            eventEmitter = this.nativeEventEmitter;
        } else {
            eventEmitter = DeviceEventEmitter;
        }

        this.subscriptionStartTimer = eventEmitter.addListener(
            'startTimer', this._startTimer);

            this.subscriptionviewcalldata = eventEmitter.addListener(
                'viewcalldata', this.showAttendees);

        this.subscriptionStopTimer = eventEmitter.addListener(
                'stopTimer', this._stopTimer);
        this.subscriptionConnectionStatus = eventEmitter.addListener(
            'connectionStatus', this._connectionStatus);
        if (AudioMode.getSpeakerState) {
            AudioMode.getSpeakerState().then(speakerOn => {
                this.setState({ speakerOn });
            });
        }
        BackHandler.addEventListener('hardwareBackPress', this._onHardwareBackPress);

        const { audioOnly} = this.props;
        if(audioOnly){
            AudioMode.setAudioDevice("EARPIECE");

        }else{
            AudioMode.setAudioDevice("SPEAKER");
        }
    }

    /**
     * Implements {@code Component#componentDidUpdate}.
     *
     * @inheritdoc
     */
    componentDidUpdate(prevProps) {
        const { _showLobby } = this.props;

        if (!prevProps._showLobby && _showLobby) {
            navigate(screen.lobby.root);
        }

        if (prevProps._showLobby && !_showLobby) {
            navigate(screen.conference.main);
        }
    }

    /**
     * Implements {@link Component#componentWillUnmount()}. Invoked immediately
     * before this component is unmounted and destroyed. Disconnects the
     * conference described by the redux store/state.
     *
     * @inheritdoc
     * @returns {void}
     */
    componentWillUnmount() {
        // Tear handling any hardware button presses for back navigation down.
        BackHandler.removeEventListener('hardwareBackPress', this._onHardwareBackPress);

        clearTimeout(this._expandedLabelTimeout.current);

        this._stopTimer();
        if (this.subscriptionStartTimer && this.subscriptionStartTimer.remove) {
            this.subscriptionStartTimer.remove();
        }

        if (this.subscriptionStopTimer && this.subscriptionStopTimer.remove) {
            this.subscriptionStopTimer.remove();
        }

        if (this.subscriptionConnectionStatus && this.subscriptionConnectionStatus.remove) {
            this.subscriptionConnectionStatus.remove();
        }
    }

    /**
     * Implements React's {@link Component#render()}.
     *
     * @inheritdoc
     * @returns {ReactElement}
     */
    render() {
        const { _fullscreenEnabled } = this.props;

        return (
            <Container style = { styles.conference }>
                <StatusBar
                    barStyle = 'light-content'
                    hidden = { false }
                    translucent = { _fullscreenEnabled } />
                { this._renderContent() }
            </Container>
        );
    }
    secondsToHMS(interval) {
        var h = Math.floor(interval / 3600);
        if(h>0){
            return `${h}:${('0' + Math.floor(interval % 3600 / 60)).slice(-2)  }:${  ('0' + Math.floor(interval % 60)).slice(-2)}`;
        }else{
            return `${Math.floor(interval / 60)  }:${  ('0' + Math.floor(interval % 60)).slice(-2)}`;
        }
    }

    _setSpeakerState(speakerOn){
        this.setState({speakerOn});
    }

    _startTimer: () => void

    _stopTimer: () => void

    _connectionStatus :() => void
    _onClick: () => void;

    /**
     * Changes the value of the toolboxVisible state, thus allowing us to switch
     * between Toolbox and Filmstrip and change their visibility.
     *
     * @private
     * @returns {void}
     */
    _onClick() {
        this._setToolboxVisible(!this.props._toolboxVisible);
    }

    _onHardwareBackPress: () => boolean;

    /**
     * Handles a hardware button press for back navigation. Enters Picture-in-Picture mode
     * (if supported) or leaves the associated {@code Conference} otherwise.
     *
     * @returns {boolean} Exiting the app is undesired, so {@code true} is always returned.
     */
    _onHardwareBackPress() {
        let p;

        if (this.props._pictureInPictureEnabled) {
            const { PictureInPicture } = NativeModules;

            p = PictureInPicture.enterPictureInPicture();
        } else {
            p = Promise.reject(new Error('PiP not enabled'));
        }

        p.catch(() => {
            this.props.dispatch(appNavigate(undefined));
        });

        return true;
    }
 /**
     * Method to startTimer.
     */
  _startTimer() {
    this.intervalObj = setInterval(() => {
        this.setState({ interval: this.state.interval + 1 });
    }, 1000);
}

showAttendees() {
    if(OpenMelpChat.showAttendees){

      const { participants } = this.props;

const array = [];
//  const filterarray =  participants.filter(p => !p.local)
for (const [id, attendee] of participants) {
 if(attendee.email){
     array.push(attendee.email)
 }
}
//AudioMode.participantArray(array);
        OpenMelpChat.showAttendees(array);
    }
    //this.setState({showAttendees: !this.state.showAttendees});
}

/**
 * Method to stopTimer.
 */
 _stopTimer() {
    clearInterval(this.intervalObj);
}

/**
 * Method to set connection status.
 */
_connectionStatus(event) {
    const {status } = event;
    this.setState({ connectionStatus: status || event });
}
/**
 * Method to set State of speaker
 * @param {*} speakerOn
 */
_setSpeakerState(speakerOn){
    this.setState({speakerOn});
}
    /**
     * Renders the conference notification badge if the feature is enabled.
     *
     * @private
     * @returns {React$Node}
     */
    _renderConferenceNotification() {
        const { _calendarEnabled, _reducedUI } = this.props;

        return (
            _calendarEnabled && !_reducedUI
                ? <ConferenceNotification />
                : undefined);
    }

    _createOnPress: (string) => void;

    /**
     * Creates a function to be invoked when the onPress of the touchables are
     * triggered.
     *
     * @param {string} label - The identifier of the label that's onLayout is
     * triggered.
     * @returns {Function}
     */
    _createOnPress(label) {
        return () => {
            const { visibleExpandedLabel } = this.state;

            const newVisibleExpandedLabel
                = visibleExpandedLabel === label ? undefined : label;

            clearTimeout(this._expandedLabelTimeout.current);
            this.setState({
                visibleExpandedLabel: newVisibleExpandedLabel
            });

            if (newVisibleExpandedLabel) {
                this._expandedLabelTimeout.current = setTimeout(() => {
                    this.setState({
                        visibleExpandedLabel: undefined
                    });
                }, EXPANDED_LABEL_TIMEOUT);
            }
        };
    }

    /**
     * Renders the content for the Conference container.
     *
     * @private
     * @returns {React$Element}
     */
    _renderContent() {
        const {
            _connecting,
            _isOneToOneConference,
            _largeVideoParticipantId,
            _reducedUI,
            _shouldDisplayTileView,
            _toolboxVisible, 
            participants,
            roomName,
            isTeamsCall,
            audioOnly
        } = this.props;

        const { interval, showAttendees, speakerOn, connectionStatus } = this.state;
        const secsToMinString = this.secondsToHMS(interval);


        if (_reducedUI) {
            return this._renderContentForReducedUi();
        }

        OpenMelpChat.isAudioMode(true);

        return (
            !audioOnly ? <ConferenceOld />
            : (
            <AudioScreen>
            <SafeAreaView style = { isTeamsCall ? { backgroundColor: 'black',flex: 1 }: { backgroundColor: 'rgb(252,252,252)',flex: 1 } }>
                    <View style = { isTeamsCall ? styles.mainContainerTeamsStyle:styles.mainContainerOneToOneStyle }>

                        <UpperTextContainer isTeamsCall = { isTeamsCall } />
                        <CalleeDetails connectionState = {connectionStatus} connected = { _connecting } isTeamsCall = {isTeamsCall} roomName={roomName} secsToMinString = {secsToMinString} />
                        {/* <Chat /> */}
                        {/* <AddPeopleDialog /> */}
                        <CustomisedToolBox
                        isTeamsCall = { isTeamsCall }
                        speakerOn= { speakerOn }
                        setSpeakerState = {this._setSpeakerState}
                        showAttendees = {this.showAttendees}
                        isShowingAttendees = { showAttendees }/>
                        {
                           showAttendees && <Attendees showAttendees = {this.showAttendees}/>
                        }
                 <SafeAreaView
                    pointerEvents = 'box-none'
                    style = {
                        _toolboxVisible
                            ? [ styles.titleBarSafeViewTransparent, { top: this.props.insets.top + 50 } ]
                            : styles.titleBarSafeViewTransparent
                    }>
                    <View
                        pointerEvents = 'box-none'
                        style = { styles.expandedLabelWrapper }>
                        <ExpandedLabelPopup visibleExpandedLabel = { this.state.visibleExpandedLabel } />
                    </View>
                    <View
                        pointerEvents = 'box-none'
                        style = { styles.alwaysOnTitleBar }>
                        {/* eslint-disable-next-line react/jsx-no-bind */}
                        <AlwaysOnLabels createOnPress = { this._createOnPress } />
                    </View>
                    {this._renderNotificationsContainer()}
                </SafeAreaView>
                        {/* <TestConnectionInfo /> */}

                        {/* {
                            this._renderConferenceNotification()
                        } */}
                        <View style = { styles.customFilmstripViewBoxStyle } >
                           <Filmstrip connectionState = { this._connectionStatus }/>
                       </View>
                    </View>
            </SafeAreaView>
            </AudioScreen>
            )
        );
    }

    /**
     * Renders the content for the Conference container when in "reduced UI" mode.
     *
     * @private
     * @returns {React$Element}
     */
    _renderContentForReducedUi() {
        const { _connecting } = this.props;

        return (
            <>
                <LargeVideo onClick = { this._onClick } />

                {
                    _connecting
                        && <TintedView>
                            <LoadingIndicator />
                        </TintedView>
                }
            </>
        );
    }

    /**
     * Renders a container for notifications to be displayed by the
     * base/notifications feature.
     *
     * @private
     * @returns {React$Element}
     */
    _renderNotificationsContainer() {
        const notificationsStyle = {};

        // In the landscape mode (wide) there's problem with notifications being
        // shadowed by the filmstrip rendered on the right. This makes the "x"
        // button not clickable. In order to avoid that a margin of the
        // filmstrip's size is added to the right.
        //
        // Pawel: after many attempts I failed to make notifications adjust to
        // their contents width because of column and rows being used in the
        // flex layout. The only option that seemed to limit the notification's
        // size was explicit 'width' value which is not better than the margin
        // added here.
        const { _aspectRatio, _filmstripVisible } = this.props;

        if (_filmstripVisible && _aspectRatio !== ASPECT_RATIO_NARROW) {
            notificationsStyle.marginRight = FILMSTRIP_SIZE;
        }

        return super.renderNotificationsContainer(
            {
                style: notificationsStyle
            }
        );
    }

    _setToolboxVisible: (boolean) => void;

    /**
     * Dispatches an action changing the visibility of the {@link Toolbox}.
     *
     * @private
     * @param {boolean} visible - Pass {@code true} to show the
     * {@code Toolbox} or {@code false} to hide it.
     * @returns {void}
     */
    _setToolboxVisible(visible) {
        this.props.dispatch(setToolboxVisible(visible));
    }
}

/**
 * Maps (parts of) the redux state to the associated {@code Conference}'s props.
 *
 * @param {Object} state - The redux state.
 * @private
 * @returns {Props}
 */
function _mapStateToProps(state, ownProps) {

    const { connecting, connection } = state['features/base/connection'];
    const {
        conference,
        joining,
        membersOnly,
        leaving,
        room
    } = state['features/base/conference'];

    const { isOpen } = state['features/participants-pane'];
    const { aspectRatio, reducedUI } = state['features/base/responsive-ui'];
    const { _participantId } = ownProps;

    const participants = getParticipants(state);

    const participantsCount = getParticipantCountRemoteOnly(state);

    const _settings = state['features/base/settings'];
if(totalUser!=participantsCount){
    totalUser  = participantsCount
NativeModules.NativeCallsNew.totalUsers(participantsCount);
}


    return {
        ...abstractMapStateToProps(state),
        _aspectRatio: aspectRatio,
        _calendarEnabled: isCalendarEnabled(state),
        _connecting: isConnecting(state),
        _filmstripVisible: isFilmstripVisible(state),
        _fullscreenEnabled: getFeatureFlag(state, FULLSCREEN_ENABLED, true),
        _isOneToOneConference: false,
        _isParticipantsPaneOpen: isOpen,
        _largeVideoParticipantId: state['features/large-video'].participantId,
        _pictureInPictureEnabled: getFeatureFlag(state, PIP_ENABLED),
        _reducedUI: reducedUI,
        _showLobby: getIsLobbyVisible(state),
        _toolboxVisible: isToolboxVisible(state),
        participants,
        roomName: _settings.teamName || '',
        isTeamsCall: _settings.isGroupCall,
        audioOnly: state['features/base/audio-only'].enabled
    };
}

export default withSafeAreaInsets(connect(_mapStateToProps)(Conference));
import React, { useCallback } from 'react';
import { useDispatch } from 'react-redux';

import { createToolbarEvent } from '../../../../analytics/AnalyticsEvents';
import { sendAnalytics } from '../../../../analytics/functions';
import { appNavigate } from '../../../../app/actions.native';
import Button from '../../../../base/ui/components/native/Button';
import { BUTTON_TYPES } from '../../../../base/ui/constants.native';

import EndMeetingIcon from './EndMeetingIcon';
// eslint-disable-next-line lines-around-comment
// @ts-ignore
import styles from './styles';
import { connect } from 'react-redux';
import {
    getParticipants,getParticipantCountRemoteOnly
} from '../../../../base/participants/functions';
import { translate } from '../../../../base/i18n/functions';
import {  NativeModules} from 'react-native';
import { endConference } from '../../../../base/conference/actions';


/**
 * Button for ending meeting from carmode.
 *
 * @returns {JSX.Element} - The end meeting button.
 */
 const EndMeetingButton = (props) => {
    const dispatch = useDispatch();
  
    const onSelect = useCallback(() => {
      if(props._settings.isPrivateRoom){
        sendAnalytics(createToolbarEvent('endmeeting'));
        dispatch(endConference());
        dispatch(appNavigate(undefined));
        NativeModules.NativeCallsNew.hangup();
    
    }else if(props._settings.isGroupCall && props._participantsCount == 1){
        sendAnalytics(createToolbarEvent('endmeeting'));
        props.dispatch(endConference());
        props.dispatch(appNavigate(undefined));
        NativeModules.NativeCallsNew.hangup();
    }else{
        sendAnalytics(createToolbarEvent('hangup'));
        dispatch(appNavigate(undefined));
        NativeModules.NativeCallsNew.hangup();
    }

    }, [dispatch]);

    return (
        <Button
            accessibilityLabel = 'toolbar.accessibilityLabel.leaveConference'
            icon = { EndMeetingIcon }
            labelKey = 'toolbar.leaveConference'
            onClick = { onSelect }
            style = { styles.endMeetingButton }
            type = { BUTTON_TYPES.DESTRUCTIVE } />
    );
};

function _mapStateToProps(state) {
    return {
        _settings: state['features/base/settings'],
        _participantsCount: getParticipantCountRemoteOnly(state)

    };
}
export default translate(connect(_mapStateToProps)(EndMeetingButton));
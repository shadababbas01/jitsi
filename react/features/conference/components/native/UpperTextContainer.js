import React, { Component } from 'react';
import { View, Text ,Image} from 'react-native';
import PictureInPictureButton from '../../../mobile/picture-in-picture/components/PictureInPictureButton';
import { connect } from 'react-redux';
import {
    getParticipants
} from '../../../base/participants/functions';
import styles, { SECURITY_CALL_LOGO } from './styles';

class UpperTextContainer extends Component {
    render() {
        const { isTeamsCall } = this.props;
        const upperTextContainerStyle = isTeamsCall? styles.upperTextTeamContainerStyle : styles.upperTextOneToOneContainerStyle;
        const upperText = isTeamsCall ? 'CONFERENCE CALL' : 'STARTED CALL WITH';
        const encryptedTextStyle = isTeamsCall? styles.encryptedTextTeamStyle: styles.encryptedTextOneToOneStyle;

        return (
            <View style  ={styles.parentViewStyle}>
                 <View style = { styles.pipButtonContainer }>
                <PictureInPictureButton styles = { styles.pipButton } />
            </View>
                <View >
                       <Text style = {upperTextContainerStyle} >{upperText}</Text>

                </View>
                <View >
                       <Text style = {encryptedTextStyle} >ENCRYPTED</Text>

                </View>
            </View>
           
        );
    }
}


function _mapStateToProps(state, ownProps) {
    const participants = getParticipants(state);
    return {
        participants
    };
}

export default connect(_mapStateToProps)(UpperTextContainer);

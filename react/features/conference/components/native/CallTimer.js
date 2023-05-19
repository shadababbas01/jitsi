import React, { Component } from 'react';
import { View, Text, Image } from 'react-native';
import styles, { CALL_ICON, CALL_ONETOONE_ICON } from './styles';
class CallTimer extends Component {

    // intervalObj; 

    // secondsToMinutes(interval){
    //     return Math.floor(interval / 60) + ':' + ('0' + Math.floor(interval % 60)).slice(-2);
    // }

    // constructor(props){
    //     super(props);
    //     this.state = {interval: 0};
    //     this.intervalObj = setInterval(()=>{this.setState({interval:this.state.interval+1})}, 1000);
    //     this.secondsToMinutes.bind(this);
    // }


    
    
    render() {
        const {isTeamsCall, secsToMinString} = this.props;
        const callerTimeStyle = isTeamsCall?styles.callerTimeTeamContainerStyle:styles.callerTimeOneToOneContainerStyle;
        const timerTextStyle = isTeamsCall?styles.timerTextTeamStyle:styles.timerTextOneToOneStyle;
        const callIcon = isTeamsCall?CALL_ICON:CALL_ONETOONE_ICON;
        const callIconStyle = isTeamsCall? styles.callIcon: styles.callOneToOneIcon;
        return (
            <View style = {callerTimeStyle}>
                <Image source = { callIcon } style = { callIconStyle } />
                <Text style = {timerTextStyle}>{secsToMinString}</Text>
            </View>
        );
    }

    // componentWillUnmount() {
    //     clearInterval(this.intervalObj);
    // }
}

export default CallTimer;
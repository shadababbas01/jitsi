import React, { Component } from 'react';
import { NativeModules } from 'react-native';

const { OpenMelpChat } = NativeModules;
class AudioScreen extends Component {

    componentDidMount(){
        if(OpenMelpChat && OpenMelpChat.isAudioMode){
            OpenMelpChat.isAudioMode(true);
        }
    }

    render() {
        return this.props.children;
    }
}

export default AudioScreen;
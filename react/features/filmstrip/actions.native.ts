import { IStore } from '../app/types';
import { getParticipantCount, getParticipantCountWithFake } from '../base/participants/functions';
import conferenceStyles from '../conference/components/native/styles';

import { SET_TILE_VIEW_DIMENSIONS } from './actionTypes';
import styles from './components/native/styles';
import { SQUARE_TILE_ASPECT_RATIO, TILE_MARGIN } from './constants';
import { getTileViewParticipantCount } from './functions.native';

export * from './actions.any';

/**
 * Sets the dimensions of the tile view grid. The action is only partially implemented on native as not all
 * of the values are currently used. Check the description of {@link SET_TILE_VIEW_DIMENSIONS} for the full set
 * of properties.
 *
 * @returns {Function}
 */
export function setTileViewDimensions() {
    return (dispatch: IStore['dispatch'], getState: IStore['getState']) => {
        const state = getState();
        const participantCount = getTileViewParticipantCount(state);
        const { clientHeight: height, clientWidth: width, safeAreaInsets = {
            left: undefined,
            right: undefined,
            top: undefined,
            bottom: undefined
        } } = state['features/base/responsive-ui'];
        const { left = 0, right = 0, top = 0, bottom = 0 } = safeAreaInsets;
        const columns = getColumnCount(state);
        const rows = Math.ceil(participantCount / columns); // @ts-ignore
        const conferenceBorder = conferenceStyles.conference.borderWidth || 0;
        const heightToUse = height - top - bottom - (2 * conferenceBorder);
        const widthToUse = width - (TILE_MARGIN * 2) - left - right - (2 * conferenceBorder);
        let tileWidth;

        // If there is going to be at least two rows, ensure that at least two
        // rows display fully on screen.
        if (participantCount / columns > 1) {
            tileWidth = Math.min(widthToUse / columns, heightToUse / 2);
        } else {
            tileWidth = Math.min(widthToUse / columns, heightToUse);
        }

        const tileHeight = Math.floor(tileWidth / SQUARE_TILE_ASPECT_RATIO);

        tileWidth = Math.floor(tileWidth);

        // Adding safeAreaInsets.bottom to the total height of all thumbnails because we add it as a padding to the
        // thumbnails container.
        const hasScroll = heightToUse < ((tileHeight + (2 * styles.thumbnail.margin)) * rows) + bottom;

        dispatch({
            type: SET_TILE_VIEW_DIMENSIONS,
            dimensions: {
                columns,
                thumbnailSize: {
                    height: tileHeight,
                    width: tileWidth
                },
                hasScroll
            }
        });
    };
}

/**
 * Add participant to the active participants list.
 *
 * @param {string} _participantId - The Id of the participant to be added.
 * @param {boolean?} _pinned - Whether the participant is pinned or not.
 * @returns {Object}
 */
export function addStageParticipant(_participantId: string, _pinned = false): any {
    return {};
}

/**
 * Remove participant from the active participants list.
 *
 * @param {string} _participantId - The Id of the participant to be removed.
 * @returns {Object}
 */
export function removeStageParticipant(_participantId: string): any {
    return {};
}
function getColumnCount(state: Object | Function) {
    const participantCount = getParticipantCountWithFake(state);
    const { clientHeight: height, clientWidth: width } = state['features/base/responsive-ui'];
    if(width > height){
           if(participantCount <MAX_COLUMN_LANDSCAPE * max_fit_rows)
           {
            expected_row = Math.floor(Math.sqrt(participantCount))
            expected_col = Math.ceil(participantCount / expected_row)
           }
            else{
         expected_col = participantCount/max_fit_rows
         expected_col = Math.min(expected_col, MAX_COLUMN_LANDSCAPE)
        }
           return   expected_col;
    }else{
          expected_row = Math.ceil(Math.sqrt(participantCount));
          expected_col = Math.min(MAX_COLUMN_PORTRAIT,Math.ceil(participantCount/Math.min(max_fit_rows,expected_row)));
           expected_row = Math.ceil(participantCount/expected_col)            
      return  expected_col;
    }
}

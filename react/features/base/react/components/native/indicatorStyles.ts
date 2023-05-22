import { ColorPalette } from '../../../styles/components/styles/ColorPalette';

export default {

    /**
     * Base indicator style.
     */
    indicator: {
        backgroundColor: ColorPalette.transparent,
        color: ColorPalette.white,
        fontSize: 14,
       // textShadowColor: ColorPalette.black,
        textShadowOffset: {
            height: -1,
            width: 0
        }
    }
};

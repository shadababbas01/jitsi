import React from 'react';

import Icon from '../../../icons/components/Icon';
import Popover from '../../../popover/components/Popover.web';

interface IProps {

    /**
     * The id of the element this button icon controls.
     */
    ariaControls?: string;

    /**
     * Whether the element popup is expanded.
     */
    ariaExpanded?: boolean;

    /**
     * Whether the element has a popup.
     */
    ariaHasPopup?: boolean;

    /**
     * Aria label for the Icon.
     */
    ariaLabel?: string;

    /**
     * The decorated component (ToolboxButton).
     */
    children: React.ReactNode;

    /**
     * Icon of the button.
     */
    icon: Function;

    /**
     * Flag used for disabling the small icon.
     */
    iconDisabled: boolean;

    /**
     * The ID of the icon button.
     */
    iconId: string;

    /**
     * Popover close callback.
     */
    onPopoverClose: Function;

    /**
     * Popover open callback.
     */
    onPopoverOpen: Function;

    /**
     * The content that will be displayed inside the popover.
     */
    popoverContent: React.ReactNode;

    /**
     * Additional styles.
     */
    styles?: Object;

    /**
     * Whether or not the popover is visible.
     */
    visible: boolean;
}

/**
 * Displays the `ToolboxButtonWithIcon` component.
 *
 * @param {Object} props - Component's props.
 * @returns {ReactElement}
 */
export default function ToolboxButtonWithIconPopup(props: IProps) {
    const {
        ariaControls,
        ariaExpanded,
        ariaHasPopup,
        ariaLabel,
        children,
        icon,
        iconDisabled,
        iconId,
        onPopoverClose,
        onPopoverOpen,
        popoverContent,
        styles,
        visible
    } = props;

    const iconProps: any = {};

    if (iconDisabled) {
        iconProps.className
            = 'settings-button-small-icon settings-button-small-icon--disabled';
    } else {
        iconProps.className = 'settings-button-small-icon';
        iconProps.role = 'button';
        iconProps.tabIndex = 0;
        iconProps.ariaControls = ariaControls;
        iconProps.ariaExpanded = ariaExpanded;
        iconProps.containerId = iconId;
    }


    return (
        <div
            className = 'settings-button-container'
            style = { styles }>
            {children}
            <div className = 'settings-button-small-icon-container'>
                <Popover
                    content = { popoverContent }
                    headingLabel = { ariaLabel }
                    onPopoverClose = { onPopoverClose }
                    onPopoverOpen = { onPopoverOpen }
                    position = 'top'
                    visible = { visible }>
                    <Icon
                        { ...iconProps }
                        ariaHasPopup = { ariaHasPopup }
                        ariaLabel = { ariaLabel }
                        size = { 16 }
                        src = { icon } />
                </Popover>
            </div>
        </div>
    );
}

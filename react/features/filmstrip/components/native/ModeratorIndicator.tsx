import React from 'react';

import { IconAdmin } from '../../../base/icons/svg';
// eslint-disable-next-line lines-around-comment
// @ts-ignore
import BaseIndicator from '../../../base/react/components/native/BaseIndicator';

/**
 * Thumbnail badge showing that the participant is a conference moderator.
 *
 * @returns {JSX.Element}
 */
const ModeratorIndicator = (): JSX.Element => <BaseIndicator icon = { IconAdmin } />;

export default ModeratorIndicator;

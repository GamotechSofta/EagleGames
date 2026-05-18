import React from 'react';
import EasyModeBid from './EasyModeBid';
import { useBidI18n } from '../useBidI18n';

const validateJodi = (n) => n && /^[0-9]{2}$/.test(n.toString().trim());

const JodiBid = (props) => {
    const bid = useBidI18n();
    return (
        <EasyModeBid
            {...props}
            label={bid.enterJodi}
            maxLength={2}
            validateInput={validateJodi}
            showBidsList
            openReviewOnAdd={false}
            showInlineSubmit
            showModeTabs
            specialModeType="jodi"
            desktopSplit
        />
    );
};

export default JodiBid;

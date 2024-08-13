/**
 * Based on exampled copied from https://github.com/googleworkspace/node-samples/blob/master/sheets/quickstart
 *   so applying the same licence.
 */

// TODO: simplify this by using a data filter in the sheets params to only fetch 'upcoming' dates.
// import * as sheetsJs from './sheets.js';
import * as sheetsJs from './sheets3.js';
import sheetsConfig from './sheets-config.js';

const UPCOMING_DEPS_ONLY = true;

// Load client secrets from a local file.
const milestoneTypes = ['Deployment', 'Dependency Handover'];
const interstedGroups = ['HR', 'FUL'];
const milestones = [
    'AWS Env - CFC OTP',
    'Start - HR/RR',
    'Start  - HR/RR', // this typo occurs a couple of times - todo: use regex
    'End - HR/RR',
    'Start - AC, RR, OSPN WMS',
    'End - AC, RR, OSPN WMS',
    'Start - ASRS, FUL, WMS',
    'End - ASRS, FUL, WMS',
    'Start - Bot & Control Systems',
    'End - Bot & Control Systems',
];// details for AWS Env item is 'Handover from Cloud Services to HR/RR'

console.log('Key Dates sheetsConfig.keyDatesSpreadsheet', sheetsConfig.keyDatesSpreadsheet);

const getKeyDatesPromise = async () => {
    const filterKeyDatesByMilestoneType = (keyDates) => {
        const { colHeadings } = keyDates;
        const milestoneTypeIndex = colHeadings.indexOf('Milestone Type');
        console.log(`Filtering by milestone type - col index: ${milestoneTypeIndex}`);
        const filteredByMilestoneType = keyDates.dataRows.filter(
            (row) => milestoneTypes.includes(row[milestoneTypeIndex])
        );

        return { filteredByMilestoneType, colHeadings, };
    };

    const filterByInterestedGroups = ({ filteredByMilestoneType, colHeadings }) => {
        const interestedGroupsIndex = colHeadings.indexOf('Interested Group');
        console.log(`Filtering by interested groups - col index: ${interestedGroupsIndex}, dataRows count: ${filteredByMilestoneType.length}`);
        // in this case I don't want to do an exact match.
        // Interested groups will be comma separated list of groups which I need to intersect
        const filteredByInterestedGroups = filteredByMilestoneType.filter((row) => {
            // convert interested group list for this row into array
            const rowInterestedGroups = row[interestedGroupsIndex]?.split(',').map((item) => item.trim());
            // find intersection
            const intersectingGroups = rowInterestedGroups?.filter(
                (group) => interstedGroups.includes(group)
            );
            return (intersectingGroups?.length);
        });

        return {
            filteredByInterestedGroups,
            colHeadings,
        };
    };

    const filterByMilestone = ({ filteredByInterestedGroups, colHeadings }) => {
        const milestoneIndex = colHeadings.indexOf('Milestone');
        console.log(`Filtering by milestone - col index: ${milestoneIndex}, dataRows count: ${filteredByInterestedGroups.length}`);
        const filteredByMilestone = filteredByInterestedGroups.filter(
            (row) => milestones.includes(row[milestoneIndex])
        );

        return {
            filteredByMilestone,
            colHeadings,
        };
    };

    const filterByUpcoming = ({ filteredByMilestone, colHeadings }) => {
        const dateIndex = colHeadings.indexOf('Date');

        const deltaDate = (date, yDelta, mDelta, dDelta) => new Date(
            date.getFullYear() + yDelta,
            date.getMonth() + mDelta /* 0 based! */,
            date.getDay() + dDelta,
        );

        const now = new Date();
        const monthAgo = deltaDate(now, 0, -1, 0);
        const nextYear = deltaDate(now, +1, 0, 0);
        console.log(`Filtering by upcoming only - col index: ${dateIndex}, dataRows count: ${filteredByMilestone.length}, monthAgo: ${monthAgo}, nextYear: ${nextYear}`);

        const filteredByDate = filteredByMilestone.filter((event) => {
            // what if eventDate is blank!
            const eventDateParts = event[dateIndex].split('/');
            const eventDate = new Date(
                eventDateParts[2],
                eventDateParts[1] - 1 /* 0 based! */,
                eventDateParts[0]
            );
            return (eventDate >= monthAgo) && (eventDate <= nextYear);
        });
        const upcomingDeployments = (UPCOMING_DEPS_ONLY) ? filteredByDate : filteredByMilestone;

        return {
            upcomingDeployments,
            colHeadings,
        };
    };

    const groupedByCFC = ({ upcomingDeployments, colHeadings }) => {
        console.log(`Final results count: ${upcomingDeployments.length}`);
        // now group up the records by site name and sort group records by date
        // and groups by date of first item in each group
        const dateIndex = colHeadings.indexOf('Date');
        const CFCIndex = colHeadings.indexOf('CFC');
        const sorted = [...upcomingDeployments].sort((a, b) => a[dateIndex] - b[dateIndex]);
        // I'm going to create an object with CFC id and an array of events
        const grouped = sorted.reduce((accum, event) => {
            const CFC = event[CFCIndex];
            if (accum[CFC]) {
                accum[CFC].push(event);
            } else {
                accum[CFC] = [event];
            }
            return accum;
        }, {});

        return {
            grouped,
            colHeadings,
        };
    };

    const keyDatesGroupedAndTrimmed = ({ grouped, colHeadings }) => {
        const dateIndex = colHeadings.indexOf('Date');
        const detailsIndex = colHeadings.indexOf('Details');
        const milestoneIndex = colHeadings.indexOf('Milestone');

        Object.keys(grouped).forEach((CFC) => {
            console.log(`\n${CFC}`);
            grouped[CFC].forEach((event) => console.log(`\t${event[dateIndex]},\t${event[milestoneIndex]},\t${event[detailsIndex]}`));
        });

        const CFCs = Object.keys(grouped);
        const groupedAndTrimmed = CFCs.reduce((accum, CFC) => {
            accum[CFC] = grouped[CFC].map((event) => [event[dateIndex], event[milestoneIndex], event[detailsIndex]]);
            return accum;
        }, {});

        return groupedAndTrimmed;
    };

    try {
        const keyDates = await sheetsJs.getSheetsDataPromise({
            spreadsheetId: sheetsConfig.keyDatesSpreadsheet,
            range: 'Key Dates - Sorted!A2:K100000',
        });

        const keyDatesFilteredByMilestoneType = filterKeyDatesByMilestoneType(keyDates);
        const keyDatesFilteredByInterestedGroups = filterByInterestedGroups(keyDatesFilteredByMilestoneType);
        const keyDatesFilteredByMilestone = filterByMilestone(keyDatesFilteredByInterestedGroups);
        const keyDatesFilteredByUpcoming = filterByUpcoming(keyDatesFilteredByMilestone);
        const keyDatesGroupedByCFC = groupedByCFC(keyDatesFilteredByUpcoming);
        return keyDatesGroupedAndTrimmed(keyDatesGroupedByCFC);
    } catch (e) {
        console.error('Error:', e);
    }
};

// const setKeyDates = (sheetsParams) => sheetsJs.setSheetsData(sheetsParams)
//     .then((resp) => {
//         console.log(`set key dates, resp: ${resp}`);
//     })
//     .catch((err) => {
//         console.error(`failed to update sheets: ${err}`);
//     });

export default getKeyDatesPromise;

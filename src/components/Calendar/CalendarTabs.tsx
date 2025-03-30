import React, { useState, useEffect } from 'react';
import { useMemberReservationEligibility } from '../../hooks/memberHooks';
import { usePageTitle } from '../../contexts/PageTitleContext';
import { Box, Tabs, Tab } from '@mui/material';
import { WorkCalendar } from '../WorkCalendar/WorkCalendar';
import { BoatReservationCalendar } from '../BoatReservationCalendar/BoatReservationCalendar';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`calendar-tabpanel-${index}`}
      aria-labelledby={`calendar-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `calendar-tab-${index}`,
    'aria-controls': `calendar-tabpanel-${index}`,
  };
}

export const CalendarTabs: React.FC = () => {
  const { canReserve } = useMemberReservationEligibility();
  const [value, setValue] = useState(canReserve ? 0 : 1);
  const { setBreadcrumbs } = usePageTitle();

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  useEffect(() => {
    setValue(canReserve ? 0 : 1);
  }, [canReserve, setValue]);

  useEffect(() => {
    const tabLabels = ['Vormerkbuch', 'Arbeitskalender'];
    setBreadcrumbs([
      { text: 'Kalender' },
      { text: tabLabels[value] },
    ]);
  }, [value, setBreadcrumbs]);

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={value} onChange={handleChange} aria-label="calendar tabs">
          <Tab label="Vormerkbuch" {...a11yProps(0)} />
          <Tab label="Arbeitskalender" {...a11yProps(1)} />
        </Tabs>
      </Box>
      <TabPanel value={value} index={0}>
        <BoatReservationCalendar />
      </TabPanel>
      <TabPanel value={value} index={1}>
        <WorkCalendar />
      </TabPanel>
    </Box>
  );
};

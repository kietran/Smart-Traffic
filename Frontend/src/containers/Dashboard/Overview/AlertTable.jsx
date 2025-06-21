import * as React from 'react';
import PropTypes from 'prop-types';
import Box from '@mui/material/Box';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Badge from '@mui/material/Badge';
import {SingleSelectCustom} from '../../../components/SelectCustom';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import OpacityIcon from '@mui/icons-material/Opacity';
import BakeryDiningIcon from '@mui/icons-material/BakeryDining';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import TrafficIcon from '@mui/icons-material/Traffic';
import SignpostIcon from '@mui/icons-material/Signpost';
import BusAlertIcon from '@mui/icons-material/BusAlert';
import NewReleasesIcon from '@mui/icons-material/NewReleases';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import RemoveRedEyeIcon from '@mui/icons-material/RemoveRedEye';
import ReviewEvent from "./ReviewEvent";


function Row(props) {
  const { row } = props;
  const [open, setOpen] = React.useState(false);
  const [reviewEvent, setReviewEvent] = React.useState(null);
  const [cameraFilter, setCameraFilter] = React.useState(null);
  const [typeFilter, setTypeFilter] = React.useState(null);

  const [cameraOptions, setCameraOptions] = React.useState([]);
  const [typeOptions, setTypeOptions] = React.useState([]);
  React.useEffect(() => {
    const uniqueCameras = Array.from(
      new Set(row.history.map((item) => item.camera_name))
    ).map((name) => ({
      label: name,
      value: name,
    }));
    const uniqueTypes = Array.from(
        new Set(row.history.map((item) => item.event_type))
        ).map((name) => ({
            label: name,
            value: name,
        }));
    setTypeOptions(uniqueTypes);
    setCameraOptions(uniqueCameras);
  }, [row.history]);
  const openReview = (historyRow) => {
    // Open the review page with the selected history row
    console.log("historyRow", historyRow);
    setReviewEvent(historyRow);

  }
  const handleClose = () => {
    setReviewEvent(null);
  };

  return (
    <React.Fragment>
        <ReviewEvent open={reviewEvent? true : false} data={reviewEvent}  handleClose={handleClose}/>
      <TableRow sx={{ '& > *': { borderBottom: 'unset' } }}>
        <TableCell>
          <IconButton aria-label="expand row" size="small" onClick={() => setOpen(!open)}>
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell component="th" scope="row">
          <b>{row.area_name}</b>
        </TableCell>
        
        <TableCell align="center">
                        {
            row.traffic_light ? (
            <Badge badgeContent={row.traffic_light} color="warning">
                <WarningIcon sx={{ color: 'orange' }} />
            </Badge>
            ) 
            : 
            <CheckCircleIcon sx={{ color: 'green' }} />
            }
        </TableCell>
        <TableCell align="center">
                        {
            row.traffic_jam ? (
            <Badge badgeContent={row.traffic_jam} color="warning">
                <WarningIcon sx={{ color: 'orange' }} />
            </Badge>
            ) 
            : 
            <CheckCircleIcon sx={{ color: 'green' }} />
            }
        </TableCell>
        <TableCell align="center">
            {
            row.wrong_lane ? (
            <Badge badgeContent={row.wrong_lane} color="warning">
                <WarningIcon sx={{ color: 'orange' }} />
            </Badge>
            ) 
            : 
            <CheckCircleIcon sx={{ color: 'green' }} />
            }
        </TableCell>
        <TableCell align="center">
        {
            row.wrong_direction ? (
            <Badge badgeContent={row.wrong_direction} color="warning">
                <WarningIcon sx={{ color: 'orange' }} />
            </Badge>
            ) 
            : 
            <CheckCircleIcon sx={{ color: 'green' }} />
            }
        </TableCell>
      </TableRow>
      <TableRow 
      
      >
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 , backgroundColor: '#f5f5f5' }} colSpan={6}>
          <Collapse in={open} timeout="auto" unmountOnExit sx={{  maxHeight: '600px', overflowY: 'auto' }}>
            <Box sx={{ margin: 1 }}>
            <div className="flex justify-between items-center sticky top-0 bg-[#f5f5f5] z-10 border-b-3 border-[#e0e0e0] border-t-0 border-l-0 border-r-0 border-solid">

                <Typography variant="h6" gutterBottom component="div">
                History
              </Typography>
                <div>


                <SingleSelectCustom
                    data={typeOptions}
                    label="Type"
                    singleSelectChange={(value) => {
                        setTypeFilter(value);
                    }
                    }
                />
                <SingleSelectCustom
                    data={cameraOptions}
                    label="Camera ID"
                    singleSelectChange={(value) => {
                        setCameraFilter(value);
                    }
                    }
                />
                </div>

                </div>
        
              <Table size="small" aria-label="purchases">
                <TableHead>
                  <TableRow>
                    <TableCell align="left"><b>Overview</b></TableCell>
                    <TableCell align="left"><b>Target</b></TableCell>
                    <TableCell align="center"><b>Camera Name</b></TableCell>
                    <TableCell align="right"><b>Date</b></TableCell>
                    <TableCell align="right"><b>Event Type</b></TableCell>
                    <TableCell align="right"><b>Detail</b></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {row.history.map((historyRow, index) => {
                    if (cameraFilter && historyRow.camera_name !== cameraFilter) return null;
                    if (typeFilter && historyRow.event_type !== typeFilter) return null;
                    return (
                        <TableRow key={index}
                        onClick={() => openReview(historyRow)}
                        sx={{
                            cursor: 'pointer',
                            '& > *': { borderBottom: 'unset' },
                            '&:hover': {
                              backgroundColor: 'rgba(25, 118, 210, 0.08)', // màu hover (MUI primary)
                            },
                          }}
                        >
                          <TableCell align="left">
                            <Box
                                component="img"
                                src={historyRow.thumbnail}
                                alt="event"
                                sx={{ width: 80, height: 60, borderRadius: 2, objectFit: 'cover', boxShadow: 1 }}
                            />
                          </TableCell>
                          <TableCell align="left"> 
                            <Box
                                component="img"
                                src={historyRow.target_img}
                                alt="event"
                                sx={{ width: 80, height: 60, borderRadius: 2, objectFit: 'cover', boxShadow: 1 }}
                            />
                          </TableCell>
                          <TableCell align="center">{historyRow.camera_name}</TableCell>
                          <TableCell align="right">{historyRow.date}</TableCell>
                          <TableCell align="right">{historyRow.event_type}</TableCell>
                          <TableCell align="right"><RemoveRedEyeIcon/></TableCell>
                        </TableRow>
                      )
                  })}
                </TableBody>
              </Table>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </React.Fragment>
  );
}

Row.propTypes = {
  row: PropTypes.shape({
    calories: PropTypes.number.isRequired,
    carbs: PropTypes.number.isRequired,
    fat: PropTypes.number.isRequired,
    history: PropTypes.arrayOf(
      PropTypes.shape({
        amount: PropTypes.number.isRequired,
        customerId: PropTypes.string.isRequired,
        date: PropTypes.string.isRequired,
      }),
    ).isRequired,
    name: PropTypes.string.isRequired,
    price: PropTypes.number.isRequired,
    protein: PropTypes.number.isRequired,
  }).isRequired,
};



export default function AlertTable({dataTable}) {
    console.log("dataTable", dataTable);
  return (
    <TableContainer component={Paper}>
      <Table aria-label="collapsible table">
        <TableHead>
          <TableRow>
            <TableCell />
      
            <TableCell><h3>Traffic Intersection ID</h3></TableCell>
            <TableCell align="right"><div className='flex gap-2'><h3>Red light</h3><TrafficIcon  sx={{ color: 'black' }} /></div></TableCell>
            <TableCell align="right"><div className='flex gap-2'><h3>Traffic Congestion</h3><NewReleasesIcon  sx={{ color: 'red' }} /></div></TableCell>
            <TableCell align="right"><div className='flex gap-2'><h3>Wrong Lane</h3><BusAlertIcon  sx={{ color: 'orange' }} /></div></TableCell>
            <TableCell align="right"><div className='flex gap-2'><h3>Wrong Direction</h3><SignpostIcon  sx={{ color: 'green' }} /></div></TableCell>
   
          </TableRow>
        </TableHead>
        <TableBody>
          {dataTable.map((row, index) => {

            return (
              <React.Fragment key={index}>
                <Row row={row} 
                />
              </React.Fragment>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

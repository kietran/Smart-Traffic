import { useEffect, useState, useRef } from "react";
import Dialog from "@mui/material/Dialog";
import { Grid, Box, Typography } from "@mui/material";
import Button from "@mui/material/Button";
import FrameList from "../../../components/Dashboard/VehicleSearch/FrameList";
import axios from "axios";
import {apiSetEventReviewed} from "../../../connectDB/axios";
import { parseISO, subSeconds, addSeconds } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import {apiVehicleSearch} from "../../../connectDB/axios";
import PopupManager from "../../../containers/Dashboard/PopupManager";

function extractTimeWithDateFns(isoString, segmentTimeSec) {
    const halfSeg = segmentTimeSec / 2;
    const date = parseISO(isoString); // UTC
  
    const startDate = subSeconds(date, halfSeg);
    const endDate = addSeconds(date, halfSeg);
  
    // Format lại chuẩn UTC
    const formatString = "yyyy-MM-dd-HHmmss'-0000000Z'";
    const timeZone = "UTC";
  
    return {
      startTime: formatInTimeZone(startDate, timeZone, formatString),
      endTime: formatInTimeZone(endDate, timeZone, formatString),
    };
  }

function ReviewEvent({ open, data, handleClose }) {
    const [eventData, setData] = useState([]);
    const [openDetail, setOpenDetail] = useState({ open: false, row: {} });

  useEffect(() => {
    // No need to fetch video anymore
  }, [data]);
  
  const handleReviewed = () => {
    apiSetEventReviewed({ event_id: data.event_id })
        .then((res) => {
            handleClose();
        })
        .catch((error) => {
            console.error("Error setting event as reviewed:", error);
        });
  }
  
  const getVehicleSearch = async () => {
    if (!data) return;
    let link_img = data?.target_img;
  
    try {
      const response = await fetch(link_img);
      const blob = await response.blob();
  
      const filename = link_img.split('/').pop() || 'image.jpg';
      const file = new File([blob], filename, { type: blob.type });
  
      const formData = new FormData();
      formData.append("file", file);
  
      let params = {};
      const res = await apiVehicleSearch({ formData, params });
        setData(res.results);

    } catch (error) {
      console.error("Error converting image URL to File:", error);
    }
  };

  const handleClosePopupManager = () => {
    setOpenDetail({ open: false });
  };

  return (
    <>
        <PopupManager
        open={openDetail.open}
        data={openDetail.row}
        handleClose={handleClosePopupManager}
        />

      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth={false}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          "& .MuiDialog-paper": {
            width: "70%",
            height: "80%",
            
          },
          "& .MuiDialog-container":{
            width: "100%",
          },
        }}
      >
        <Box sx={{padding: "20px", display: "flex", flexDirection: "column", gap: "20px"  }}>
            <Box sx={{ display: "flex", flexDirection: "row", gap: "20px", justifyContent: "center" }}>
                {/* Overview image */}
                <div
                    style={{ 
                      backgroundImage: `url(${data?.thumbnail})`, 
                      width: "45%", 
                      height: "500px", 
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      borderRadius: "8px",
                      boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
                      cursor: "pointer"
                    }}
                    onClick={() => {
                        setOpenDetail({ open: true, row: {"full_image": data?.thumbnail} });
                    }}
                >
                </div>
                
                {/* Target image */}
                <div
                    style={{ 
                      backgroundImage: `url(${data?.target_img})`, 
                      width: "45%", 
                      height: "500px", 
                      backgroundSize: "contain",
                      backgroundPosition: "center",
                      backgroundRepeat: "no-repeat",
                      borderRadius: "8px",
                      boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
                      cursor: "pointer"
                    }}
                    onClick={() => {
                        setOpenDetail({ open: true, row: {"full_image": data?.target_img} });
                    }}
                >
                </div>
            </Box>
            <Box sx={{height: "100%", width:"100%" ,border: "1px solid #ccc", borderRadius: "4px", padding: "4px"}}>
                <Box sx={{ display: "flex", flexDirection: "column", justifyContent: "flex-start", height: "30%", margin: "0px", alignItems:"end"  }}>   
                    <Grid container spacing={1} sx={{ padding: "2px" }}>
                        {/* Date */}
                        <Grid item xs={2}>
                            <Typography variant="h6" fontWeight="bold">Date:</Typography>
                        </Grid>
                        <Grid item xs={10}>
                            <Typography variant="body1"><b>{data?.date}</b></Typography>
                        </Grid>

                        {/* Event Type */}
                        <Grid item xs={2}>
                            <Typography variant="h6" fontWeight="bold">Event Type:</Typography>
                        </Grid>
                        <Grid item xs={10}>  
                            <Typography variant="body1"><b>{data?.event_type}</b></Typography>
                        </Grid>

                        {/* Camera Name */}
                        <Grid item xs={2}>
                            <Typography variant="h6" fontWeight="bold">Camera Name:</Typography>
                        </Grid>
                        <Grid item xs={10}>
                            <Typography variant="body1"><b>{data?.camera_name}</b></Typography>
                        </Grid>
                        
                        {/* License Plate (only shown for license_plate events) */}
                        {data?.event_type === 'license_plate' && data?.license_plate && (
                          <>
                            <Grid item xs={2}>
                                <Typography variant="h6" fontWeight="bold">License Plate:</Typography>
                            </Grid>
                            <Grid item xs={10}>
                                <Typography variant="body1"><b>{data?.license_plate}</b></Typography>
                            </Grid>
                          </>
                        )}
                    </Grid>
                    <Button 
                    onClick={handleReviewed}
                    sx={{ width:"200px"}} variant="contained" color="primary">
                        Confirm
                    </Button>
                </Box>
            </Box>

        </Box>
      
      </Dialog>
    </>
  );
}

export default ReviewEvent;

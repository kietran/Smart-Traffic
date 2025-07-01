import { useEffect, useState, useRef } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import CloseIcon from "@mui/icons-material/Close";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import VpnKeyIcon from "@mui/icons-material/VpnKey";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Button,
  IconButton,
  Divider,
  Chip,
} from "@mui/material";
import { apiGetVideo } from "../../connectDB/axios";

function PopupManager({ open, data, handleClose, showVideo=false }) {
    const videoRef = useRef(null);

  useEffect(() => {
    if (showVideo && open && data) {
      getVideo();
    }
  }, [open]);

    const getVideo = () => {
    let timestamp = data.snapshot_at || (data.start_time?.$date || data.start_time);
        const segmentTime = 120;
    const cam_id = data?.camera_id;
        apiGetVideo({cam_id, timestamp, segmentTime})
        .then((res) => {
      const url = res.video_url;
            videoRef.current.src = url;
        })
        .catch((error) => {
            console.error("Error downloading video:", error);
        });
  };

  // Format the timestamp for display
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = new Date(timestamp.$date || timestamp);
    return date.toLocaleString();
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="md"
        fullWidth
        aria-labelledby="license-plate-dialog-title"
      >
        <DialogTitle 
          id="license-plate-dialog-title"
        sx={{
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            bgcolor: '#f5f5f5',
            borderBottom: '1px solid #ddd'
          }}
        >
          <Typography variant="h6">
            License Plate Detection Details
          </Typography>
          <IconButton aria-label="close" onClick={handleClose}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        
        <DialogContent sx={{ p: 3 }}>
          <Grid container spacing={3}>
            {/* Left column - Images */}
            <Grid item xs={12} md={7}>
              {/* Full scene image */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold' }}>
                  Scene Image
                </Typography>
                <Card>
                  <CardMedia
                    component="img"
                    image={data?.full_image || "./no-available.png"}
                    alt="Full scene"
                    sx={{ 
                      width: '100%',
                      maxHeight: '300px',
                      objectFit: 'contain'
                    }}
                  />
                </Card>
              </Box>
              
              {/* Vehicle and plate images */}
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold' }}>
                    Vehicle
                  </Typography>
                  <Card>
                    <CardMedia
                      component="img"
                      image={data?.target_image || "./no-available.png"}
                      alt="Vehicle"
                      sx={{ 
                        width: '100%',
                        height: '150px',
                        objectFit: 'contain'
                      }}
                    />
                  </Card>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold' }}>
                    License Plate
                  </Typography>
                  <Card>
                    <CardMedia
                      component="img"
                      image={data?.plate_image || "./no-available.png"}
                      alt="License plate"
                      sx={{ 
                        width: '100%',
                        height: '150px',
                        objectFit: 'contain'
                      }}
                    />
                  </Card>
                </Grid>
              </Grid>
            </Grid>
            
            {/* Right column - Details */}
            <Grid item xs={12} md={5}>
              <Card sx={{ mb: 2, bgcolor: '#f9f9f9' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <VpnKeyIcon sx={{ mr: 1, color: '#1976d2' }} />
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                      {data?.lpr || "Unknown"}
                    </Typography>
                  </Box>
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <AccessTimeIcon sx={{ mr: 1, color: '#1976d2' }} />
                    <Typography variant="body1">
                      {formatTimestamp(data?.start_time)}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <CameraAltIcon sx={{ mr: 1, color: '#1976d2' }} />
                    <Typography variant="body1">
                      {data?.camera_name || "Unknown Camera"}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <LocationOnIcon sx={{ mr: 1, color: '#1976d2' }} />
                    <Typography variant="body1">
                      {data?.area_name || "Unknown Location"}
                    </Typography>
                  </Box>
                  
                  <Divider sx={{ my: 2 }} />
                  
                  {/* Vehicle details */}
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <DirectionsCarIcon sx={{ mr: 1, color: '#1976d2' }} />
                      <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                        Vehicle Details
                      </Typography>
                    </Box>
                    
                    <Grid container spacing={1} sx={{ pl: 4 }}>
                      <Grid item xs={4}>
                        <Typography variant="body2" color="textSecondary">
                          Type:
                        </Typography>
                      </Grid>
                      <Grid item xs={8}>
                        <Typography variant="body2">
                          {data?.metadata?.class_name || "Unknown"}
                        </Typography>
                      </Grid>
                      
                      <Grid item xs={4}>
                        <Typography variant="body2" color="textSecondary">
                          Color:
                        </Typography>
                      </Grid>
                      <Grid item xs={8}>
                        <Typography variant="body2">
                          {data?.metadata?.color || "Unknown"}
                        </Typography>
                      </Grid>
                      
                      <Grid item xs={4}>
                        <Typography variant="body2" color="textSecondary">
                          Make:
                        </Typography>
                      </Grid>
                      <Grid item xs={8}>
                        <Typography variant="body2">
                          {data?.metadata?.logo || "Unknown"}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Box>
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Chip 
                      label={data?.is_reviewed ? "Reviewed" : "Not Reviewed"} 
                      color={data?.is_reviewed ? "success" : "default"}
                      size="small"
                    />
                    <Chip 
                      label={data?.event_type || "License Plate"} 
                      color="primary"
                      size="small"
                    />
                  </Box>
                </CardContent>
              </Card>
              
              {showVideo && (
                <Box>
                  <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold' }}>
                    Video
                  </Typography>
                <video
                ref={videoRef}
                width="100%"
                height="auto"
                controls
                    style={{ borderRadius: '4px' }}
                  />
                </Box>
              )}
            </Grid>
          </Grid>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default PopupManager;

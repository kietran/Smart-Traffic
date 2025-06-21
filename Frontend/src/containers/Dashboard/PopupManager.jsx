import { useEffect, useState, useRef } from "react";
import Dialog from "@mui/material/Dialog";
import ModeEditOutlineIcon from "@mui/icons-material/ModeEditOutline";
import TouchAppIcon from "@mui/icons-material/TouchApp";
import VideoCameraFrontIcon from "@mui/icons-material/VideoCameraFront";
import PhotoIcon from "@mui/icons-material/Photo";
import DownloadForOfflineIcon from "@mui/icons-material/DownloadForOffline";
import VisibilityIcon from "@mui/icons-material/Visibility";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Button,
  TextField,
  Pagination,
} from "@mui/material";
import { apiGetVideo } from "../../connectDB/axios";
function PopupManager({ open, data, handleClose, showVideo=false }) {
  const [count, setCount] = useState(0);
  const [value, setValue] = useState(0);
  const [selectedImage, setSelectedImage] = useState(null);
  const [filter, setFilter] = useState("");
    const videoRef = useRef(null);

  const handleImageSelect = (image) => {
    setSelectedImage(image);
  };
  useEffect(() => {

    if (showVideo && open && data) {
        getVideo()
    }
  }, [open]);

    const getVideo = () => {
        let timestamp = data.snapshot_at
        const segmentTime = 120;
        const cam_id = data?.camera_id
        apiGetVideo({cam_id, timestamp, segmentTime})
        .then((res) => {
            const url = res.video_url
            videoRef.current.src = url;
        })
        .catch((error) => {
            console.error("Error downloading video:", error);
        });
        }

  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth={true}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          "& .MuiDialog-paper": {
            width: "90vh",
          },
        }}
      >

        {
            showVideo ? (
                <video
                ref={videoRef}
                width="100%"
                height="auto"
                controls
                style={{ marginTop: "20px" }}
                autoPlay

                >
                </video>
            ) : 
            (
                <img
                src={data?.full_image}
                alt="Full Preview"
                style={{ width: "100%", height: "auto" }}
              />
            )
        }
      </Dialog>
    </>
  );
}

export default PopupManager;

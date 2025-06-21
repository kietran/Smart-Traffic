import { useEffect, useState, useRef } from "react";
import React from "react";
import {
  Grid,
  Box,
  Typography,
  Card,
  CardMedia,
  CardContent,
} from "@mui/material";
import { GoogleMap, LoadScript, Marker } from "@react-google-maps/api";
import ChartPopManager from "./ChartPopManager";
import EventList from "./EventList";
import AutoGraphIcon from "@mui/icons-material/AutoGraph";
import { apiGetEventOverview } from "../../connectDB/axios";
import PopupManager from "./PopupManager";
import LiveView from "../../containers/LiveView";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import { SingleSelectCustom } from "../../components/SelectCustom";


const intervalOptions = [
    { value: (3600 * 0.5) / 6, label: "5 Minute" },
    { value: (3600 * 0.5) / 3, label: "10 Minute" },
    { value: 3600 * 0.5, label: "0.5 Hour" },
    { value: 3600 * 1, label: "1 Hour" },
    { value: 3600 * 3, label: "3 Hour" },
    { value: 3600 * 6, label: "6 Hour" },
    { value: 3600 * 24, label: "1 Day" },
    { value: 3600 * 24 * 5, label: "5 Day" },
  ];





function Analysis() {
  const [count, setCount] = useState(0);
  const [value, setValue] = useState(0);

  const [events, setEvents] = useState([]);

  const [tableRows, setTableRows] = useState([]);
  const [cameraId, setCameraId] = useState(null);

  const [closeChart, setCloseChart] = useState(false);
  const [reviewImage, setReviewImage] = useState({});
  const [openDetail, setOpenDetail] = useState({ open: false, row: {} });
  const [areaCameraIndex, setAreaCameraIndex] = useState(0);
  const [areaCameras, setAreaCameras] = useState([]);
  const [areaId, setAreaId] = useState(null);


  const areaTabs = [
    "All",
    "LH-VNG-LL",
    "LH-NKKN-LD",
    "LH-HV-LL",
    "LH-LTT-HV",
    "LH-LTT-DK",
    "LH-NVL-VNG",
    "LH-VVK-HV",
    "LH-NVL-HVL",
    "LH-VX-HVL"
    
  ];

  useEffect(() => {
    if (areaCameraIndex === 0) {
      setAreaCameras(areaTabs.slice(1));
      setAreaId(null);
    } else {
      setAreaCameras([areaTabs[areaCameraIndex]]);
      setAreaId(areaTabs[areaCameraIndex]);
    }
    
  }, [areaCameraIndex]);

  const format_event = (event) => {
    event.full_thumbnail_path = event.full_thumbnail_path?.replace(
        "192.168.101.4",
        "100.112.243.28"
      );
      event.target_thumbnail_path = event.target_thumbnail_path?.replace(
        "192.168.101.4",
        "100.112.243.28"
      );
      event.data.plate_thumb_path = event.data.plate_thumb_path?.replace(
        "192.168.101.4",
        "100.112.243.28"
      );
      let start_time = event.start_time;
      if (typeof start_time === "number") {
          start_time = start_time * 1000;
      } else {
        start_time = start_time["$date"]
      }
        
      const start_date = new Date(start_time).toLocaleString("en-US", {
          timeZone: "UTC",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
      });
      
      return {
        full_image: event.full_thumbnail_path,
        target_image: event.target_thumbnail_path,
        plate_image: event.data.plate_thumb_path,
        lpr: event.data.target_label,
        start_time: start_date,
        event_type: event.event_type,
        camera_id: event.camera_id,
        is_reviewed: event.is_reviewed,
        metadata: event.data,
      };
    }
    const getEventOverview = (camera_id=null, area_id=null) => {
        apiGetEventOverview({
            event_type: "license_plate",
            filter_data: {camera_id, area_id},
          })
            .then((res) => {
              setTableRows(
                res.items.map((item, index) => {
                  let event = format_event(item);
                  event.id = index;
                  return event
                })
              );
            })
            .catch((err) => {
              console.error(err);
            });
    };

  useEffect(() => {
    let area_id = null
    if (areaCameraIndex !== 0) {
        area_id = areaTabs[areaCameraIndex]
    }
    getEventOverview(cameraId, area_id);

  }, [cameraId, areaCameraIndex]);
  useEffect(() => {}, [openDetail]);
  const handleClose = () => {
    setOpenDetail({ open: false });
  };
  const singleSelectChange = (value) => {
    console.log("value", value);
  };

  const handleFocusView = (camera_id) => {
    setCameraId(camera_id);
  }
  
  console.log("openDetail", openDetail)
  return (
    <Box sx={{ p: 2 }}>
      <PopupManager
        open={openDetail.open}
        data={openDetail.row}
        handleClose={handleClose}
      />
      <div className="flex justify-between items-center">
        <Tabs value={areaCameraIndex} onChange={(e, v) => setAreaCameraIndex(v)}>
            {areaTabs.map((area, index) => (
            <Tab key={index} label={area} />
            ))}
            
        </Tabs>

      </div>

      <Grid container spacing={2}>
        {/* Map Section */}
        <Grid item xs={12} md={7}>
          <LiveView areaCameras={areaCameras} handleFocusView={handleFocusView} />
        </Grid>

        {/* Right Sidebar Tool */}
        <Grid item xs={12} md={5}>
          <Card>
            <CardContent>
              <EventList
                setReviewImage={setReviewImage}
                setOpenDetail={setOpenDetail}
                rows={tableRows}
                cameraId={cameraId}
                areaId={areaId}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

export default Analysis;

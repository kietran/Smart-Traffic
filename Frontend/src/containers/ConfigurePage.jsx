import React, { useMemo, useRef, useState, useEffect } from "react";
import CameraDrawer from "./Camera/CameraDrawer";
import CameraConnect from "./Camera/CameraConnect";
import ConfigSidebar from "../components/ConfigSidebar/configSidebar";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Link } from "react-router";
import { Button } from "@mui/material";
import {
  apiGetCameraId,
  apiUpdateCamera,
  apiGetCamera,
} from "../connectDB/axios";
import SearchOptionBar from "../components/SearchOptionBar";
import DataTable from "../components/Table";

const service_info = [
  {
    id: 1,
    item_id: "reidentify",
    item_name: "ReID",
    group: null,
  },
  {
    id: 2,
    item_id: "license_plate",
    item_name: "license plate",
    group: null,
  },
  {
    id: 3,
    item_id: "vehicle_counting",
    item_name: "vehicle counting",
    group: null,
  },
  {
    id: 4,
    item_id: "speed_estimate",
    item_name: "speed estimate",
    group: null,
  },
  {
    id: 5,
    item_id: "crowd_detection",
    item_name: "crowd detection",
    group: null,
  },
  {
    id: 6,
    item_id: "traffic_light",
    item_name: "traffic light",
    group: null,
  },
  {
    id: 7,
    item_id: "accident_detection",
    item_name: "accident detection",
    group: null,
  },

];

const columns = [
  { field: "source_group", headerName: "Source Group", width: 160 },
  { field: "source_line", headerName: "Source Line", width: 160 },
  { field: "source_direction", headerName: "Source Direction", width: 160 },
  { field: "target_group", headerName: "Target Group", width: 160 },
  { field: "target_line", headerName: "Target Line", width: 160 },
  { field: "target_direction", headerName: "Target Direction", width: 160 },
];

const org_rows = [
  {
    id: 1,
    source_group: "A",
    source_line: "1",
    source_direction: "in",
    target_group: "B",
    target_line: "2",
    target_direction: "out",
  },
  {
    id: 2,

    source_group: "A",
    source_line: "2",
    source_direction: "in",
    target_group: "B",
    target_line: "2",
    target_direction: "out",
  },
  {
    id: 3,
    source_group: "A",
    source_line: "3",
    source_direction: "in",
    target_group: "C",
    target_line: "2",
    target_direction: "out",
  },
];

function ConfigurePage() {
  const [serviceName, setServiceName] = useState(null);
  const [cameraId, setCameraId] = useState(null);
  const [camera_info, setCameraInfo] = useState([]);
  const [lines, setLines] = useState([]);
  const [zones, setZones] = useState([]);
  const [draw_data, setDrawData] = useState({});

  const callBackService = (row) => {
    if (cameraId && row) {
      setServiceName(row.item_id);
    }
  };
  const callBackCamera = (row) => {
    setCameraId(row ? row.item_id : null);
    if (row) {
      setServiceName(null);
    }
  };
  React.useEffect(() => {
    const fetchData = async () => {
      await apiGetCamera()
        .then((res) => {
          const { data } = res;
          if (data.length > 0) {
            // edit data same as format of service_info
            const cameraInfo = data.map((item) => ({
              id: item.camera_id,
              item_id: item.camera_id,
              item_name: item.camera_name,
              group: item.group_name,
            }));
            setCameraInfo(cameraInfo);
          }
        })
        .catch((err) => {
          console.error(err);
        });
    };

    fetchData();
  }, []);
  const applyCallback = () => {
    if (cameraId) {
        apiGetCameraId({ id: cameraId })
          .then((response) => {
            const services = response.data.services;
            let lines = [];
            let zones = [];
            Object.entries(services).forEach(([service_name, service_data], index) => {
              const crossLines = service_data?.lines || [];
              const polygonZones = service_data?.zones || [];

              crossLines.forEach((line, j) => {
                lines.push({
                  id: `${index}-${j}`,
                  camera_name: response.data.camera_name,
                  draw_type: "cross_line",
                  draw_name: line?.name || `line_${j}`,
                  groups_connected:  [],
                  service_name: service_name,
                  lines_data: service_data

                });
                
              });
              polygonZones.forEach((zone, j) => {
                    zones.push({
                    id: `${index}-${j}`,
                    camera_name: response.data.camera_name,
                    draw_type: "zone",
                    draw_name: zone?.name || `zone_${j}`,
                    groups_connected:  [],
                    service_name: service_name,
                    zones_data: service_data

                  });
                }
                );

            });
            
            setLines(lines);
            setZones(zones);
            setDrawData(services)
          })
          .catch((error) => console.error("Error fetching image:", error));
      } else {
        setServiceName(null);
      }
  };
  useEffect(() => {
    applyCallback();

  }, [cameraId]);

  return (
    <>
      <div className="w-full flex bg-white p-4">
        <SearchOptionBar
          data={camera_info}
          label="Camera info"
          callBack={callBackCamera}
        />
        <div>
          <SearchOptionBar
            data={service_info}
            callBack={callBackService}
            label="AI Service"
            vary={cameraId}
          />
        </div>
      </div>
      <CameraDrawer
        serviceName={serviceName}
        cameraId={cameraId}
        applyCallback={applyCallback}
        data={draw_data}

      />
    </>
  );
}

export default ConfigurePage;

import { useEffect, useState,useRef } from "react";
import { Grid, Box, Typography } from "@mui/material";
import { PieChartCustom, StraightAnglePieChartCustom } from "./PieChartCustom";
import { AreaChartCustom } from "./AreaChartCustom";
import {ScatterChartCustom} from "./ScatterChart";
import StatHeadManager from "./Overview/StatHeadManager";
import { apiGetSummaryTraffic, apiGetCamera, apiGetAlertOverview, apiGetEventOverview } from "../../connectDB/axios";
import AlertTable from "./Overview/AlertTable";
import {
  SingleSelectCustom,
  MultipleSelectCustom,
} from "../../components/SelectCustom";

import SearchOptionBar from "../../components/SearchOptionBar";
const data = [
  { x: 100, y: 200, z: 200 },
  { x: 120, y: 100, z: 260 },
  { x: 170, y: 300, z: 400 },
  { x: 140, y: 250, z: 280 },
  { x: 150, y: 400, z: 500 },
  { x: 110, y: 280, z: 200 },
];

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

const summarizeByArea = (data) => {
    const result = {};
    data.forEach((item) => {
        const params = new URL(item.url).searchParams;
        const cameraId = params.get("camera");
      const {
        area_id,
        area_name,
        camera_name,
        reviewed = 0,
        total = 0,
        history = [],
      } = item;
      if (!result[area_id]) {
        result[area_id] = {
          area_id,
          area_name,
            total: 0,
            reviewed: 0,
          history: [],
        };
      }
      result[area_id].reviewed += reviewed;
      result[area_id].total += total;
      const enrichedHistory = history.map((h) => ({
        ...h,
        cameraId,
        camera_name,
      }));
      result[area_id].history.push(...enrichedHistory);
    });
  
    // Trả kết quả dạng array
    return Object.values(result);
  };
  

function Overview() {
  const [count, setCount] = useState(0);
  const [dataArea, setDataArea] = useState({});
  const [multiSelectValues, setMultiSelectValues] = useState([]);
  const [area, setArea] = useState([]);
  const [cameraInfo, setCameraInfo] = useState([]);
  const [dataAlertTable, setDataAlertTable] = useState([]);
  const [dataAlertTableTmp, setDataAlertTableTmp] = useState([]);
  const [scatterData, setScatterData] = useState([]);
  const [cameraNames, setCameraNames] = useState([]);
  const [totalStats, setTotalStats] = useState({});
  const [trafficCameraSelect, setTrafficCameraSelect] = useState(null);
  const [areaVehicleCounts, setAreaVehicleCounts] = useState({});
    const wsRef = useRef(null);
  
  const [trafficIntervalSelect, setTrafficIntervalSelect] = useState(
    (3600 * 0.5) 
  );

  const field = ["car", "motorbike", "bus", "truck", "bicycle"];


  const fetchCamera = async () => {
    await apiGetCamera()
      .then((res) => {
        const { data } = res;
        if (data.length > 0) {
          const _cameraInfo = data.map((item) => ({
            id: item.camera_id,
            item_id: item.camera_id,
            item_name: item.camera_name,
            group: item.area_id,
          }));
          setTotalStats((prev) => ({
            ...prev,
            total_cameras: data.length
        }));
          setCameraInfo(_cameraInfo);

        }
      })
      .catch((err) => {
        console.error(err);
      });
  };


  const fetchSummaryTraffic = async ({
    camera_ids = ["all"],
    interval = 3600 * 0.5,
  }) => {
    let total_transformedData = {};

    for (let i = 0; i < camera_ids.length; i++) {
      const camera_id = camera_ids[i];
      try {
        const res = await apiGetSummaryTraffic({
          camera_id: camera_id,
          interval: interval,
        });
        const transformedData = Object.fromEntries(
          Object.entries(res.summary).map(([date, items]) => {
            const classCount = items.reduce((acc, item) => {
              const className = item.class_name;
              acc[className] = (acc[className] || 0) + 1;
              return acc;
            }, {});
            return [date, classCount];
          })
        );

        Object.keys(transformedData).forEach((date) => {
          field.forEach((key) => {
            if (!(key in transformedData[date])) {
              transformedData[date][key] = 0;
            }
          });

          const d = formatDateTime(date);
          transformedData[date]["date"] = d;
          if (!(date in total_transformedData)) {
            total_transformedData[date] = { ...transformedData[date] };
          } else {
            field.forEach((key) => {
              total_transformedData[date][key] =
                (total_transformedData[date][key] || 0) +
                (transformedData[date][key] || 0);
            });
          }
        });
      } catch (err) {
        console.error("❌ fetchSummaryTraffic error:", err);
      }
    }

    setDataArea((prev) => ({
      ...prev,
      traffic: total_transformedData,
    }));
  };

  function formatDateTime(dateTimeStr) {
    const [date, time] = dateTimeStr.split(" ");
    const [day, month, year] = date.split("-");
    const [hour, minute] = time.split(":");

    // Return the original date string without any timezone adjustments
    return dateTimeStr;
  }
  useEffect(() => {

  }, []);

  const handleTrafficCameraSelect = (data) => {
    setTrafficCameraSelect(data?.item_id);
    if (!data?.item_id) {
      fetchSummaryTraffic({
        camera_ids: ["all"],
        interval: trafficIntervalSelect,
      });
    } else {
      fetchSummaryTraffic({
        camera_ids: [data?.item_id],
        interval: trafficIntervalSelect,
      });
    }
  };

  const singleSelectChange = (value) => {
    setTrafficIntervalSelect(value);
    fetchSummaryTraffic({
      camera_ids: [trafficCameraSelect],
      interval: value,
    });
  };



    useEffect(() => {
        setTrafficCameraSelect("all");
        fetchSummaryTraffic({
          camera_ids: ["all"],
          interval: trafficIntervalSelect,
        });
        fetchCamera();

        // Create a map to store vehicle counts by area
        let tempAreaVehicleCounts = {};

        // Get vehicle counts from traffic data
        apiGetSummaryTraffic({
          camera_id: "all",
          interval: 3600 * 24, // Daily data
        })
          .then((res) => {
            // Process the data to get vehicle counts by camera/area
            if (res.summary) {
              Object.entries(res.summary).forEach(([date, items]) => {
                items.forEach(item => {
                  const cameraId = item.camera_id;
                  if (cameraId) {
                    const areaId = cameraId.split('_')[0]; // Extract area ID from camera ID
                    if (!tempAreaVehicleCounts[areaId]) {
                      tempAreaVehicleCounts[areaId] = 0;
                    }
                    tempAreaVehicleCounts[areaId]++;
                  }
                });
              });
            }
            
            // Store the vehicle counts in state
            setAreaVehicleCounts(tempAreaVehicleCounts);

            // Now fetch alert data
      apiGetAlertOverview({
        event_type: "all",
        filter_data: {},
              start_time: Math.floor(Date.now() / 1000) - (5 * 60), // Last 5 minutes
      })
        .then((res) => {
            const summarizedData = summarizeByArea(res.items);
            let total_alert = summarizedData.reduce((acc, item) => {
                return acc + item.total;
            }, 0);
                  
                  // Count license plate events
                  let licensePlateEvents = 0;
                  let wrongDirectionEvents = 0;
                  let totalVehicles = 0;
                  
                  // Add vehicle counts to each area
                  summarizedData.forEach(area => {
                    const areaId = area.area_id;
                    area.vehicle_count = tempAreaVehicleCounts[areaId] || 0;
                    
                    area.history.forEach(event => {
                      if (event.event_type === 'license_plate') {
                        licensePlateEvents++;
                      }
                      if (event.event_type === 'wrong_direction') {
                        wrongDirectionEvents++;
                      }
                    });
                  });
                  
                  console.log("summarizedData", summarizedData);
                  let total_reviewed = summarizedData.reduce((acc, item) => {
                      return acc + item.reviewed;
                  }, 0);

                  setTotalStats((prev) => ({
                      ...prev,
                      total_alerts: licensePlateEvents,
                      total_wrong_direction: wrongDirectionEvents,
                      total_reviewed: total_reviewed,
                      total_resolved: total_reviewed,
                  }));
                  setDataAlertTable(summarizedData);
                  setDataAlertTableTmp(summarizedData);
              })
              .catch((err) => {
                console.error(err);
              });
          })
          .catch((err) => {
            console.error("Error fetching vehicle counts:", err);
            
            // If vehicle count fetch fails, still get alert data
            apiGetAlertOverview({
              event_type: "all",
              filter_data: {},
              start_time: Math.floor(Date.now() / 1000) - (5 * 60), // Last 5 minutes
            })
              .then((res) => {
                  const summarizedData = summarizeByArea(res.items);
                  
                  // Count license plate events
                  let licensePlateEvents = 0;
                  let wrongDirectionEvents = 0;
                  
                  summarizedData.forEach(area => {
                    area.history.forEach(event => {
                      if (event.event_type === 'license_plate') {
                        licensePlateEvents++;
                      }
                      if (event.event_type === 'wrong_direction') {
                        wrongDirectionEvents++;
                      }
                    });
                  });
                  
            let total_reviewed = summarizedData.reduce((acc, item) => {
                return acc + item.reviewed;
            }, 0);

            setTotalStats((prev) => ({
                ...prev,
                      total_alerts: licensePlateEvents,
                      total_wrong_direction: wrongDirectionEvents,
                total_reviewed: total_reviewed,
                total_resolved: total_reviewed,
            }));
                  setDataAlertTable(summarizedData);
                  setDataAlertTableTmp(summarizedData);
        })
        .catch((err) => {
          console.error(err);
              });
        });
    }, []);
    
    // Calculate total vehicles from traffic data
    useEffect(() => {
      if (dataArea.traffic && Object.values(dataArea.traffic).length > 0) {
        // Sum up all vehicle counts from the last data point
        const lastDataPoint = Object.values(dataArea.traffic).pop();
        if (lastDataPoint) {
          const totalVehicles = field.reduce((sum, vehicleType) => {
            return sum + (lastDataPoint[vehicleType] || 0);
          }, 0);
          
          setTotalStats(prev => ({
            ...prev,
            total_vehicles: totalVehicles
          }));
        }
      }
    }, [dataArea.traffic]);

    // apiGetEventOverview({
    //   event_type: "speed_estimate",
    //   filter_data: {},
    // })
    //   .then((res) => {
    //     let data = []
    //       res.items.forEach((item, index) => {
    //         let start_time = item.start_time["$date"];
    //         item.data.speed_data.forEach((speed_data => {
    //             let max_at_timestamp = speed_data.max_at_timestamp
    //             const date = new Date(max_at_timestamp * 1000); 
      
    //             data.push(
    //                 {
    //                     // camera_id: item.camera_id,
    //                     // camera_name: item.camera_name,
    //                     // area_id: item.area_id,
    //                     // area_name: item.area_name,
    //                     // ...speed_data,
    //                     x: max_at_timestamp,
    //                     y: speed_data.max_speed,
    //                     z: speed_data.avg_speed,
    //                 }
    //             )
    //         }))
    //       })

    //       setScatterData(data)
    //   })
    //   .catch((err) => {
    //     console.error(err);
    //   });

    
  const filterEventInterval = (value) => {
    console.log("Selected interval value:", value);
    
    if (!value) {
      // If no value is selected, use the default 5 minutes
      value = 5 * 60;
    }
    
    // Calculate the start time based on the selected interval
    const startTime = Math.floor(Date.now() / 1000) - value;
    
    // Make a new API call with the updated time interval for alert events
    apiGetAlertOverview({
      event_type: "all",
      filter_data: {},
      start_time: startTime,
    })
      .then((res) => {
        const summarizedData = summarizeByArea(res.items);
        
        // Count license plate events
        let licensePlateEvents = 0;
        let wrongDirectionEvents = 0;
        
        // Add vehicle counts to each area using the state variable
        summarizedData.forEach(area => {
          const areaId = area.area_id;
          area.vehicle_count = areaVehicleCounts[areaId] || 0;
          
          // Count events by type
          area.history.forEach(event => {
            if (event.event_type === 'license_plate') {
              licensePlateEvents++;
            }
            if (event.event_type === 'wrong_direction') {
              wrongDirectionEvents++;
            }
          });
        });
        
        console.log("Updated data for interval:", value, summarizedData);
        console.log("License plate events:", licensePlateEvents);
        console.log("Wrong direction events:", wrongDirectionEvents);
        
        // Now get license plate events separately since they're not in ALERT_TYPE
        apiGetEventOverview({
          event_type: "license_plate",
          filter_data: {},
          start_time: startTime,
          end_time: Math.floor(Date.now() / 1000),
        })
          .then((lprRes) => {
            console.log("License plate events response:", lprRes);
            
            // Process license plate events and add them to the summarized data
            if (lprRes.items && lprRes.items.length > 0) {
              lprRes.items.forEach(lprEvent => {
                const areaId = lprEvent.area_id;
                const areaIndex = summarizedData.findIndex(area => area.area_id === areaId);
                
                if (areaIndex >= 0) {
                  // Format the event to match the structure in history
                  const formattedEvent = {
                    date: new Date(lprEvent.start_time.$date).toISOString().replace('T', ' ').substring(0, 19),
                    event_id: lprEvent._id.$oid,
                    is_reviewed: lprEvent.is_reviewed,
                    timestamp: lprEvent.start_time,
                    event_type: 'license_plate',
                    thumbnail: lprEvent.full_thumbnail_path,
                    license_plate: lprEvent.data?.license_plate,
                    plate_img: lprEvent.data?.plate_img,
                    target_img: lprEvent.target_thumbnail_path,
                    camera_name: lprEvent.camera_name,
                    cameraId: lprEvent.camera_id
                  };
                  
                  // Add to history
                  summarizedData[areaIndex].history.push(formattedEvent);
                  licensePlateEvents++;
                }
              });
              
              console.log("Updated data with license plate events:", summarizedData);
              console.log("Updated license plate count:", licensePlateEvents);
            }
            
            let total_reviewed = summarizedData.reduce((acc, item) => {
              return acc + item.reviewed;
            }, 0);

            setTotalStats((prev) => ({
              ...prev,
              total_alerts: licensePlateEvents,
              total_wrong_direction: wrongDirectionEvents,
              total_reviewed: total_reviewed,
              total_resolved: total_reviewed,
            }));
            
            setDataAlertTable(summarizedData);
            setDataAlertTableTmp(summarizedData);
          })
          .catch((err) => {
            console.error("Error fetching license plate events:", err);
            
            // Still update with what we have
            let total_reviewed = summarizedData.reduce((acc, item) => {
              return acc + item.reviewed;
            }, 0);

            setTotalStats((prev) => ({
              ...prev,
              total_alerts: licensePlateEvents,
              total_wrong_direction: wrongDirectionEvents,
              total_reviewed: total_reviewed,
              total_resolved: total_reviewed,
            }));
            
            setDataAlertTable(summarizedData);
            setDataAlertTableTmp(summarizedData);
          });
      })
      .catch((err) => {
        console.error("Error fetching alert data for interval:", value, err);
      });
  };


     useEffect(() => {
        const ws = new WebSocket("ws://100.65.31.128:1239/events"); // ✅ Thay bằng URL WebSocket server của bạn
        wsRef.current = ws;
        ws.onopen = () => {
          console.log("🟢 Connected to WebSocket");
        };
    
        ws.onmessage = (event) => {
          let data = JSON.parse(event.data);
            console.log("🟢 ÊÊÊ WebSocket message:", data);
          if (data.is_alert && data.action) {
            if (data.action === "reviewed") {
                let event_id = data.event_id;
                let area_id = data.area_id;

                // filter dataAlertTable with event_id
                setTotalStats((prev) => ({
                    ...prev,
                    total_reviewed: prev.total_reviewed + 1,
                    total_resolved: prev.total_resolved + 1,
                    total_alerts: prev.total_alerts - 1,
                }));

                setDataAlertTable((prev) => {
                    let newData = prev.map((item) => {
                        if (item.area_id === area_id) {
                            let history = item.history.filter((historyItem) => {
                                return historyItem.event_id !== event_id;
                            });
                            return {
                                ...item,
                                history: history,
                            }
                        }
                        return item;
                    })
                    return newData;
                }
                )
                
            }
              

          }
        };
        
    
        ws.onerror = (err) => {
          console.error("❌ WebSocket error:", err);
        };
    
        ws.onclose = () => {
          console.warn("🔴 WebSocket disconnected");
          reconnectTimer.current = setTimeout(() => connect(), 1000); // 🔁 Retry sau 3 giây
        };
    
        // Cleanup khi component unmount
        return () => {
          ws.close();
        };
      }, []);

  return (
    <>
      <Box sx={{ p: 4, ml: 6, mr: 6, mt: 2 }}>
        <Typography variant="h4" gutterBottom>
          Vehicle Monitoring Dashboard
        </Typography>
        <StatHeadManager totalStats={totalStats}/>
        <Box className="bg-white p-6 mt-10 rounded-xl shadow-custom">
          <Box className="flex justify-between items-center">
            <Typography variant="h6" className="font-bold" align="left">
              AI Detection Events
            </Typography>
            <SingleSelectCustom data={intervalOptions} label="Interval" singleSelectChange={filterEventInterval} />

          </Box>

          {/* <Grid container spacing={4}>
            {trafficData.map((item) => (
              <Grid item xs={12} sm={6} key={item.id}>
                <Typography variant="h6" align="center">
                  {item.type}
                </Typography>
                {renderGrid()}
              </Grid>
            ))}
          </Grid> */}
          <AlertTable dataTable={dataAlertTable}/>
        </Box>

        {/* <Box sx={{ mt: 2 }}>
          <Typography variant="h6" align="left">
            Camera information
          </Typography>
          <Box className="h-[240px] flex align-center justify-center">
            <PieChartCustom />
            <StraightAnglePieChartCustom />
          </Box>
        </Box> */}
        <Box className="bg-white p-6 mt-10 rounded-xl shadow-custom">
          <Box className="p-2">
            <Box className="flex justify-between items-center">
              <Typography variant="h6" className="font-bold" align="left">
                Vehicle Count
              </Typography>
              <Box className="flex-1 flex justify-end items-center">
                <SingleSelectCustom
                  data={intervalOptions}
                  label="Interval"
                  singleSelectChange={singleSelectChange}
                />
                <SearchOptionBar
                  data={cameraInfo}
                  label="Camera info"
                  callBack={handleTrafficCameraSelect}
                  width={250}
                />
              </Box>
            </Box>

            <Box className="h-[300px] flex align-center justify-center mt-2">
              <AreaChartCustom
                title="Vehicle Count"
                data={dataArea.traffic && Object.values(dataArea.traffic)}
                multiSelectValues={multiSelectValues}
                area={area}
              />
            </Box>
          </Box>
          <Box sx={{ mt: 4, mb: 4 }}>
          {/* <Box className="flex justify-between items-center">
            <Typography variant="h6" className="font-bold mb-4" align="left">
                Speed flow
                </Typography>
              <Box className="flex-1 flex justify-end items-center">
                <SingleSelectCustom
                  data={intervalOptions}
                  label="Interval"
                  singleSelectChange={singleSelectChange}
                />
                <SearchOptionBar
                  data={cameraInfo}
                  label="Camera info"
                  callBack={handleTrafficCameraSelect}
                  width={250}
                />
              </Box>
            </Box> */}

{/* 
            <Box className="h-[300px] flex align-center justify-center mt-2">
              <ScatterChartCustom data={scatterData}/>
            </Box> */}
          </Box>
        </Box>

        {/* <Box sx={{ mt: 4, height: 300 }}>
        <Typography variant="h6" gutterBottom>
          Inter-Vùng Table
        </Typography>
        <DataTable rows={rows} columns={columns} />
      </Box> */}
      </Box>
    </>
  );
}

export default Overview;

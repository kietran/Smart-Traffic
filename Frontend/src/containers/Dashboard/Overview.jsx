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
const trafficData = [
  { id: 1, type: "Red light" },
  { id: 2, type: "OverSpeed" },
  { id: 3, type: "Traffic jam" },
  { id: 4, type: "Accident" },
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
        traffic_light = 0,
        accident = 0,
        wrong_lane = 0,
        wrong_direction = 0,
        traffic_jam = 0,
        total = 0,
        history = [],
      } = item;
      if (!result[area_id]) {
        result[area_id] = {
          area_id,
          area_name,
          traffic_light: 0,
          accident: 0,
          wrong_lane: 0,
          wrong_direction: 0,
          traffic_jam: 0,
            total: 0,
            reviewed: 0,
          history: [],
        };
      }
      result[area_id].traffic_light += traffic_light;
      result[area_id].accident += accident;
      result[area_id].wrong_lane += wrong_lane;
      result[area_id].wrong_direction += wrong_direction;
      result[area_id].traffic_jam += traffic_jam;
      result[area_id].reviewed += reviewed;
      result[area_id].total += (traffic_light + accident + wrong_lane + wrong_direction + traffic_jam);
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


      apiGetAlertOverview({
        event_type: "all",
        filter_data: {},
        start_time: 0,
      })
        .then((res) => {
            const summarizedData = summarizeByArea(res.items);
            let total_alert = summarizedData.reduce((acc, item) => {
                return acc + item.total;
            }, 0);
            console.log("summarizedData", summarizedData)
            let total_reviewed = summarizedData.reduce((acc, item) => {
                return acc + item.reviewed;
            }, 0);

            setTotalStats((prev) => ({
                ...prev,
                total_alerts: total_alert,
                total_reviewed: total_reviewed,
                total_resolved: total_reviewed,
            }));
            setDataAlertTable(summarizedData)
            setDataAlertTableTmp(summarizedData)
        })
        .catch((err) => {
          console.error(err);
        });
    }, []);

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
    console.log("value", value);
    // filter with timestamp in history each area in dataAlertTable where timestamp > now - value and value is in second
    if (!value) {
        setDataAlertTable(dataAlertTableTmp);
        return;
    }
    const filteredData = dataAlertTableTmp.map((item) => {
        let data = {
            traffic_light: 0,
            accident: 0,
            wrong_lane: 0,
            wrong_direction: 0,
            traffic_jam: 0,
            total: 0,
        }

        const filteredHistory = item.history.filter((historyItem) => {
            
            let historyTimestamp = historyItem.date;
            // historyTimestamp format 2025-05-03 14:13:58
            // convert historyTimestamp to timestamp
            const event_type = historyItem.event_type;
            const [date, time] = historyTimestamp.split(" ");
            const [year, month, day] = date.split("-");
            const [hour, minute, second] = time.split(":");
            const historyDate = new Date(year, month - 1, day, hour, minute, second);
            historyTimestamp = historyDate.getTime() / 1000;
            const now = new Date().getTime() / 1000;
   
            if (historyTimestamp > now - value) {
                data.total += 1;
                if (event_type === "traffic_light") {
                    data.traffic_light += 1;
                }
                if (event_type === "accident") {
                    data.accident += 1;
                }
                if (event_type === "wrong_lane") {
                    data.wrong_lane += 1;
                }
                if (event_type === "wrong_direction") {
                    data.wrong_direction += 1;
                }
                if (event_type === "crowd_detection") {
                    data.traffic_jam += 1;
                }
                

            }
            return historyTimestamp > now - value;

        });
        // update total, number in filteredHistory.history with event_type
        
        return {
            ...item,
            ...data,
            
            history: filteredHistory,
        };
    });
    setDataAlertTable(filteredData);

  };


     useEffect(() => {
        const ws = new WebSocket("ws://100.112.243.28:1239/events"); // ✅ Thay bằng URL WebSocket server của bạn
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
          Traffic Status Dashboard
        </Typography>
        <StatHeadManager totalStats={totalStats}/>
        <Box className="bg-white p-6 mt-10 rounded-xl shadow-custom">
          <Box className="flex justify-between items-center">
            <Typography variant="h6" className="font-bold" align="left">
              Alert information
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
                Traffic flow
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
                title="Traffic flow"
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

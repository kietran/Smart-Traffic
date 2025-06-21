import axios from "axios";

let API = axios.create({
  baseURL: `http://100.112.243.28:1239`,
  headers: {
    "Content-Type": "application/json",
  },
});

export const apiRegister = async (data) => {
  let res = await API.post("/api/register", data);
  return res.data;
};

export const apiSetEventReviewed = async (data) => {
  let res = await API.post("/events/viewed", {}, {params: data});
  return res.data;
};


export const apiSearchLpr = async (data) => {
  let res = await API.post("/reid_analysis/search_lpr", data, {params: data});
  return res.data;
};
export const apiGetVideo = async (params) => {
  let res = await API.get("/api/events/video", {params: params});
  console.log("###res", res)
  return res.data;
};

export const apiLogin = async (data) => {
  let res = await API.post("/api/login", data);
  return res.data;
};

export const apiGetCamera = async (data) => {
  let res = await API.get("/api/cameras", data);
  return res.data;
};
export const apiGetSummaryTraffic = async (params) => {
  let res = await API.get("/api/counting/total_in_out", {
    params,
  });
  return res.data;
};
export const apiGetFrame = async (data) => {
  let res = await API.get(`/api/${data.id}/latest.webp`);
  return res.data;
};
export const apiGetCameraId = async (params) => {
  let res = await API.get(`/api/cameras/${params.id}`);
  return res.data;
};
export const apiDeleteCameraId = async (params) => {
  let res = await API.delete(`/api/cameras/${params.id}`);
  return res.data;
};
export const apiAddCamera = async (params) => {
  let res = await API.post("/api/cameras", params.data, {
    params,
  });
  return res.data;
};
export const apiUpdateCamera = async (data) => {
  let res = await API.put(`/api/cameras/${data.camera_id}`, data.data);
  return res.data;
};

export const apiUpdateCameraStatus = async (params) => {
  let res = await API.put(`/cameras/${params.id}/status`, null, {
    params,
  });
  return res.data;
};
export const apiGetEventOverview = async (data) => {
  let res = await API.post(`/events/overview`, data.filter_data, {
    params: data,
  });
  return res.data;
};
export const apiGetAlertOverview = async (data) => {
  let res = await API.post(`/alert/overview`, data, {
    params: data,
  });
  return res.data;
};
export const apiVehicleSearch = async (data) => {
 
  let res = await API.post(`/api/reid_analysis/search_vehicle`, data.formData, {
    params: data.params,
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return res.data;
};
export const apiLPR = async (formData) => {
  let res = await API.post(`/api/reid_analysis/lpr`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return res.data;
};

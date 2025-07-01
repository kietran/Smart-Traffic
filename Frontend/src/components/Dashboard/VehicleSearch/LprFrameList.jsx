import * as React from "react";
import { useEffect } from "react";
import ImageList from "@mui/material/ImageList";
import ImageListItem from "@mui/material/ImageListItem";
import ImageListItemBar from "@mui/material/ImageListItemBar";
import IconButton from "@mui/material/IconButton";
import InfoIcon from "@mui/icons-material/Info";
import PopupManager from "../../../containers/Dashboard/PopupManager";

const area_data = [
    { id: "LH-LTT-DK", name: "THGT điểm giao đường Lý Thái Tổ - Đồng Khởi" },
    { id: "LH-HV-LL", name: "Nút giao Hùng Vương – Lê Lợi" }
];

export default function LprFrameList({ previewList = [], timeStrings = [], height = "90vh" }) {
    const [frameHoverIndex, setFrameHoverIndex] = React.useState(false);
    const [openDetail, setOpenDetail] = React.useState({ open: false, row: {} });
    const [viewImageList, setViewImageList] = React.useState([]);

    const handleClose = () => {
        setOpenDetail({ open: false });
    };

    useEffect(() => {
        let new_previewList = [...previewList];
        if (previewList.length > 0) {
            if (timeStrings.length === 2) {
                const startTime = new Date(timeStrings[0]);
                const endTime = new Date(timeStrings[1]);
                new_previewList = previewList.filter((item) => {
                    const itemTime = new Date(item.start_time?.$date || item.start_time);
                    return itemTime >= startTime && itemTime <= endTime;
                });
            }
            
            const groupedByArea = new_previewList.reduce((acc, item) => {
                let areaKey = item.camera_id.split("_")[0];
                areaKey = area_data.find((area) => area.id === areaKey)?.name || areaKey;
                if (!acc[areaKey]) acc[areaKey] = [];
                acc[areaKey].push(item);
                return acc;
            }, {});
            
            setViewImageList(groupedByArea);
        } else {
            setViewImageList([]);
        }
    }, [previewList, timeStrings]);

    return (
        <>
            {Object.entries(viewImageList).map(([area, items]) => (
                <div key={area} style={{ padding: "10px" }}>
                    <h3 style={{ margin: "0", color: "#333", padding: "4px", textAlign: "left" }}>{area}</h3>
                    <ImageList
                        sx={{
                            display: "flex",
                            flexWrap: "wrap",
                            justifyContent: "start",
                            marginBottom: "50px",
                            borderWidth: "1px",
                            borderColor: "#ccc",
                            borderStyle: "dashed",
                            borderRadius: "4px",
                            padding: "10px",
                        }}
                        cols={5}
                    >
                        {items.map((item, index) => (
                            <ImageListItem
                                key={index}
                                onMouseOver={() => setFrameHoverIndex(index)}
                                onMouseOut={() => setFrameHoverIndex(-1)}
                                sx={{
                                    width: "240px",
                                    height: "200px !important",
                                    position: "relative",
                                }}
                            >
                                <div
                                    style={{
                                        backgroundImage: `url(${item.full_image || item.target_image || "./no-available.png"})`,
                                        width: "240px",
                                        height: "200px",
                                        backgroundSize: "cover",
                                        backgroundPosition: "center",
                                        backgroundRepeat: "no-repeat",
                                        borderRadius: "4px",
                                        boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                                    }}
                                    onClick={() => {
                                        setOpenDetail({
                                            open: true,
                                            row: item,
                                        });
                                    }}
                                    alt={item.camera_name}
                                />

                                <ImageListItemBar
                                    title={`${item.camera_name} - ${item.lpr}`}
                                    subtitle={new Date(item.start_time?.$date || item.start_time).toLocaleString()}
                                    sx={{
                                        opacity: frameHoverIndex === index ? 1 : 0.5,
                                        backgroundColor: "rgba(0, 0, 0, 0.5)",
                                        position: "absolute",
                                        bottom: 0,
                                        left: 0,
                                        right: 0,
                                        "& .MuiImageListItemBar-title": { fontSize: "16px" },
                                        "& .MuiImageListItemBar-subtitle": { fontSize: "12px" },
                                    }}
                                    actionIcon={
                                        <IconButton
                                            sx={{ color: "rgba(255, 255, 255, 0.54)" }}
                                            aria-label={`info about ${item.lpr}`}
                                        >
                                            <InfoIcon />
                                        </IconButton>
                                    }
                                />
                            </ImageListItem>
                        ))}
                    </ImageList>
                </div>
            ))}

            <PopupManager
                open={openDetail.open}
                data={openDetail.row}
                handleClose={handleClose}
            />
        </>
    );
} 
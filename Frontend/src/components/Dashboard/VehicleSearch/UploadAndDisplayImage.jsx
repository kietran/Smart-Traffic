import React, { useState, useRef } from "react";
import {
    Box,
    Button,
    IconButton,
    Paper,
    Typography,
    Link,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import CloseIcon from "@mui/icons-material/Close";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
const UploadAndDisplayImage = ({ image, setImage }) => {
    const fileInputRef = useRef(null);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                const base64 = reader.result;
                let imageURI = base64;
                setImage({ imageURI, file });
            };
        }
    };

    const handleDeleteImage = () => {
        setImage(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleUploadClick = () => {
        fileInputRef.current.click();
    };

    return (
        <Paper
            elevation={3}
            sx={{
                p: 3,
                mx: "auto",
                textAlign: "center",
                border: "1px solid #ddd",
                borderRadius: "4px",
                height: "300px",
                mb: 2,
                position: "relative",
            }}
        >
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    mb: 2,
                }}
            >
                <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                    File Upload
                </Typography>
            </Box>
            <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleImageChange}
                style={{ display: "none" }}
            />
            <Box>
                {image?.imageURI ? (
                    <>
                        {
                            <IconButton
                                onClick={handleDeleteImage}
                                sx={{
                                    position: "absolute",
                                    top: 0,
                                    right: 0,
                                    zIndex: 1,
                                    fontSize: 16,
                                    backgroundColor: "white",
                                    borderWidth: 4,
                                    borderStyle: "solid",
                                    borderColor: "grey.300",
                                    borderRadius: "50%",
                                    color: "black",
                                    ":hover": {
                                        backgroundColor: "grey.300",
                                        color: "black",
                                    },
                                }}
                            >
                                <CloseIcon />
                            </IconButton>
                        }
                        {/* <Box
                            component="img"
                            src={image ? image.imageUrl : ""}
                            alt="Preview"
                            sx={{
                                width: "95%",
                                height: "90%",
                                borderRadius: 1,
                                mb: 1,
                                boxShadow: 3,
                                position: "absolute",
                                top: 10,
                                left: 10,
                                right: 10,
                                bottom: 10,
                                margin: "auto",
                            }}
                        /> */}
                        <div
                            style={{
                                width: "95%",
                                height: "250px",
                                backgroundImage: `url(${image.imageURI})`,
                                backgroundSize: "contain",
                                backgroundPosition: "center",
                                backgroundRepeat: "no-repeat",
                                borderRadius: "1px",
                                boxShadow: "0px 4px 6px rgba(0,0,0,0.1)",
                            }}
                        ></div>
                    </>
                ) : (
                    <>
                        <Box
                            component="div"
                            onClick={handleUploadClick}
                            sx={{
                                width: "95%",
                                height: "90%",
                                borderRadius: 1,
                                mb: 1,
                                position: "absolute",
                                top: 10,
                                left: 10,
                                right: 10,
                                bottom: 10,
                                margin: "auto",
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "center",
                                alignItems: "center",
                            }}
                        >
                            <CloudUploadIcon
                                sx={{
                                    fontSize: 48,
                                    mb: 1,
                                    color: "action.active",
                                }}
                            />
                            <Typography variant="body1" sx={{ mb: 1 }}>
                                Drop files here or upload
                            </Typography>
                        </Box>
                    </>
                )}
            </Box>
        </Paper>
    );
};

export default UploadAndDisplayImage;

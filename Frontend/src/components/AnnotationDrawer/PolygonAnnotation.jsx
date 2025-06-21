import React, { useMemo, useRef, useState, useEffect } from "react";
import { Text, Rect, Transformer, Line, Circle, Group } from "react-konva";
import { minMax, dragBoundFunc } from "../../utils";
/**
 *
 * @param {minMaxX} props
 * minMaxX[0]=>minX
 * minMaxX[1]=>maxX
 *
 */

const PolygonAnnotation = (props) => {
  const {
    points,
    polygonIndex = -1,
    color = "#0FF1FF",
    fill = "rgb(140,30,255,0.3)",
    circle_fill = "#00F1FF",
    flattenedPoints,
    isFinished,
    handlePointDragMove,
    handleGroupDragEnd,
    handleMouseOverStartPoint,
    handleMouseOutStartPoint,
    setPolygonIndexConnect = () => {},
  } = props;
  const vertexRadius = 6;
  const textRef = useRef(null);
  const [stage, setStage] = useState();

  const [annotation, setAnnotation] = useState({});
  const handleGroupMouseOver = (e) => {
    if (!isFinished) return;
    e.target.getStage().container().style.cursor = "move";
    setStage(e.target.getStage());
  };
  const handleGroupMouseOut = (e) => {
    e.target.getStage().container().style.cursor = "default";
  };

  useEffect(() => {
    let annotation_data = {};
    if (points.length == 2) {
      const x = points[0][0] + (points[1][0] - points[0][0]) / 2;
      const y = points[0][1] + (points[1][1] - points[0][1]) / 2;
      annotation_data["text"] = [x, y];
      setAnnotation(annotation_data);
    }
  }, [polygonIndex]);

  const [minMaxX, setMinMaxX] = useState([0, 0]); //min and max in x axis
  const [minMaxY, setMinMaxY] = useState([0, 0]); //min and max in y axis
  const handleGroupDragStart = (e) => {
    let arrX = points.map((p) => p[0]);
    let arrY = points.map((p) => p[1]);
    setMinMaxX(minMax(arrX));
    setMinMaxY(minMax(arrY));
  };
  const groupDragBound = (pos) => {
    let { x, y } = pos;
    const sw = stage.width();
    const sh = stage.height();
    if (minMaxY[0] + y < 0) y = -1 * minMaxY[0];
    if (minMaxX[0] + x < 0) x = -1 * minMaxX[0];
    if (minMaxY[1] + y > sh) y = sh - minMaxY[1];
    if (minMaxX[1] + x > sw) x = sw - minMaxX[1];
    return { x, y };
  };
  const transformerRef = useRef(null);

  const isSelected = false;
  useEffect(() => {
    if (isSelected && transformerRef.current !== null) {
      transformerRef.current.nodes([textRef.current]);
      transformerRef.current.getLayer().batchDraw();
    }
  }, [isSelected]);
  const transformer = isSelected ? (
    <Transformer
      ref={transformerRef}
      rotateEnabled={false}
      flipEnabled={false}
      enabledAnchors={["middle-left", "middle-right"]}
      boundBoxFunc={(oldBox, newBox) => {
        newBox.width = Math.max(30, newBox.width);
        return newBox;
      }}
    />
  ) : null;
  function handleResize() {
    if (textRef.current !== null) {
      const textNode = textRef.current;
      const newWidth = textNode.width() * textNode.scaleX();
      const newHeight = textNode.height() * textNode.scaleY();
      textNode.setAttrs({
        width: newWidth,
        scaleX: 1,
      });
      onResize(newWidth, newHeight);
    }
  }
  return (
    <Group
      name="polygon"
      draggable={true}
      onDragStart={handleGroupDragStart}
      onDragEnd={handleGroupDragEnd}
      dragBoundFunc={groupDragBound}
      onMouseOver={handleGroupMouseOver}
      onMouseOut={handleGroupMouseOut}
    >
      <Line
        points={flattenedPoints}
        stroke={color}
        strokeWidth={3}
        closed={isFinished}
        fill={fill}
        onClick={() => setPolygonIndexConnect(polygonIndex)}
      />

      {points.map((point, index) => {
        const x = point[0] - vertexRadius / 2;
        const y = point[1] - vertexRadius / 2;
        const startPointAttr =
          index === 0
            ? {
                hitStrokeWidth: 12,
                onMouseOver: handleMouseOverStartPoint,
                onMouseOut: handleMouseOutStartPoint,
              }
            : null;

        return (
          <Circle
            key={index}
            x={x}
            y={y}
            radius={vertexRadius}
            fill={circle_fill}
            stroke="#00F1FF"
            strokeWidth={2}
            draggable
            onDragMove={handlePointDragMove}
            dragBoundFunc={(pos) =>
              dragBoundFunc(stage.width(), stage.height(), vertexRadius, pos)
            }
            {...startPointAttr}
          />
        );
      })}
    </Group>
  );
};

export default PolygonAnnotation;

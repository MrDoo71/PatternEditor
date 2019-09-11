/* eslint-disable prefer-rest-params */
/**
 *  SampleHandler.js
 *
 *  @copyright 2003, 2013 Kevin Lindsey
 *  @module SampleHandler
 */

/**
 *  SampleHandler
 */
class SampleHandler {
    constructor() {
        this.logs = [];
    }

    /**
     *  log
     *
     *  @param {string} name
     *  @param {Array<string>} params
     */
    log(name, ...params) {
        this.logs.push(`${name}(${params.join(",")})`);
    }

    /**
     *  arcAbs - A
     *
     *  @param {number} rx
     *  @param {number} ry
     *  @param {number} xAxisRotation
     *  @param {boolean} largeArcFlag
     *  @param {boolean} sweepFlag
     *  @param {number} x
     *  @param {number} y
     */
    arcAbs(rx, ry, xAxisRotation, largeArcFlag, sweepFlag, x, y) {
        this.log("arcAbs", ...arguments);
    }

    /**
     *  arcRel - a
     *
     *  @param {number} rx
     *  @param {number} ry
     *  @param {number} xAxisRotation
     *  @param {boolean} largeArcFlag
     *  @param {boolean} sweepFlag
     *  @param {number} x
     *  @param {number} y
     */
    arcRel(rx, ry, xAxisRotation, largeArcFlag, sweepFlag, x, y) {
        this.log("arcRel", ...arguments);
    }

    /**
     *  curvetoCubicAbs - C
     *
     *  @param {number} x1
     *  @param {number} y1
     *  @param {number} x2
     *  @param {number} y2
     *  @param {number} x
     *  @param {number} y
     */
    curvetoCubicAbs(x1, y1, x2, y2, x, y) {
        this.log("curvetoCubicAbs", ...arguments);
    }

    /**
     *  curvetoCubicRel - c
     *
     *  @param {number} x1
     *  @param {number} y1
     *  @param {number} x2
     *  @param {number} y2
     *  @param {number} x
     *  @param {number} y
     */
    curvetoCubicRel(x1, y1, x2, y2, x, y) {
        this.log("curvetoCubicRel", ...arguments);
    }

    /**
     *  linetoHorizontalAbs - H
     *
     *  @param {number} x
     */
    linetoHorizontalAbs(x) {
        this.log("linetoHorizontalAbs", ...arguments);
    }

    /**
     *  linetoHorizontalRel - h
     *
     *  @param {number} x
     */
    linetoHorizontalRel(x) {
        this.log("linetoHorizontalRel", ...arguments);
    }

    /**
     *  linetoAbs - L
     *
     *  @param {number} x
     *  @param {number} y
     */
    linetoAbs(x, y) {
        this.log("linetoAbs", ...arguments);
    }

    /**
     *  linetoRel - l
     *
     *  @param {number} x
     *  @param {number} y
     */
    linetoRel(x, y) {
        this.log("linetoRel", ...arguments);
    }

    /**
     *  movetoAbs - M
     *
     *  @param {number} x
     *  @param {number} y
     */
    movetoAbs(x, y) {
        this.log("movetoAbs", ...arguments);
    }

    /**
     *  movetoRel - m
     *
     *  @param {number} x
     *  @param {number} y
     */
    movetoRel(x, y) {
        this.log("movetoRel", ...arguments);
    }

    /**
     *  curvetoQuadraticAbs - Q
     *
     *  @param {number} x1
     *  @param {number} y1
     *  @param {number} x
     *  @param {number} y
     */
    curvetoQuadraticAbs(x1, y1, x, y) {
        this.log("curvetoQuadraticAbs", ...arguments);
    }

    /**
     *  curvetoQuadraticRel - q
     *
     *  @param {number} x1
     *  @param {number} y1
     *  @param {number} x
     *  @param {number} y
     */
    curvetoQuadraticRel(x1, y1, x, y) {
        this.log("curvetoQuadraticRel", ...arguments);
    }

    /**
     *  curvetoCubicSmoothAbs - S
     *
     *  @param {number} x2
     *  @param {number} y2
     *  @param {number} x
     *  @param {number} y
     */
    curvetoCubicSmoothAbs(x2, y2, x, y) {
        this.log("curvetoCubicSmoothAbs", ...arguments);
    }

    /**
     *  curvetoCubicSmoothRel - s
     *
     *  @param {number} x2
     *  @param {number} y2
     *  @param {number} x
     *  @param {number} y
     */
    curvetoCubicSmoothRel(x2, y2, x, y) {
        this.log("curvetoCubicSmoothRel", ...arguments);
    }

    /**
     *  curvetoQuadraticSmoothAbs - T
     *
     *  @param {number} x
     *  @param {number} y
     */
    curvetoQuadraticSmoothAbs(x, y) {
        this.log("curvetoQuadraticSmoothAbs", ...arguments);
    }

    /**
     *  curvetoQuadraticSmoothRel - t
     *
     *  @param {number} x
     *  @param {number} y
     */
    curvetoQuadraticSmoothRel(x, y) {
        this.log("curvetoQuadraticSmoothRel", ...arguments);
    }

    /**
     *  linetoVerticalAbs - V
     *
     *  @param {number} y
     */
    linetoVerticalAbs(y) {
        this.log("linetoVerticalAbs", ...arguments);
    }

    /**
     *  linetoVerticalRel - v
     *
     *  @param {number} y
     */
    linetoVerticalRel(y) {
        this.log("linetoVerticalRel", ...arguments);
    }

    /**
     *  closePath - z or Z
     */
    closePath() {
        this.log("closePath", ...arguments);
    }
}

export default SampleHandler;

//(c) Copyright 2019 Jason Dore
//Inspired by the excellent seamly2D/Valentina (XXX ref) developed by Roman/Susan etc.
//this is a ground up implementation in Javascript intended to be compatible with, but
//not based on, the seamly2D/Valentina pattern making systen in order to support community
//pattern sharing website. 

//var Point2D = require('kld-affine/Point2D');

define(function (require) {
    require('../expression');
    require('./DrawingObject');
    require('./ArcSimple');
    require('./Line');
    require('./PointAlongLine');
    require('./PointAlongPerpendicular');
    require('./PointCurveIntersectAxis');
    require('./PointEndLine');
    require('./PointLineIntersect');
    require('./PointSingle');

});


var scale;



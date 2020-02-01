class PatternPiece {

    constructor (data, pattern) {
        this.data = data;
        this.drawing = {};
        this.pattern = pattern;

        if (data) {
            this.name = data.name;
            this.drawingObjects = data.drawingObject;
        }
        else {
            this.drawingObjects = [];
        }
        this.bounds = {
            minX: undefined,
            maxX: undefined,
            minY: undefined,
            maxY: undefined
        };
        this.init();
    }
    
    init() {
        this.bounds = {
            minX: undefined,
            maxX: undefined,
            minY: undefined,
            maxY: undefined,
            adjust: function (p) {
                var x = p.x;
                var y = p.y;
                if (x !== undefined) {
                    if ((this.minX === undefined) || (x < this.minX))
                        this.minX = x;
                    if ((this.maxX === undefined) || (x > this.maxX))
                        this.maxX = x;
                }
                if (y !== undefined) {
                    if ((this.minY === undefined) || (y < this.minY))
                        this.minY = y;
                    if ((this.maxY === undefined) || (y > this.maxY))
                        this.maxY = y;
                }
            },
            adjustForLine: function (line) {
                this.adjust(line.p1);
                this.adjust(line.p2);
            }
        };
        if (!this.data)
            return;
        //Take each drawingObject in the JSON and convert to the appropriate 
        //type of object.
        for (var a = 0; a < this.drawingObjects.length; a++) {
            var dObj = this.drawingObjects[a];
            dObj = this.newDrawingObj(dObj);
            if (dObj === null)
                continue;
            //    throw( "Unknown objectType:" + dObj.objectType );
            this.drawingObjects[a] = dObj; //these are now the objects with methods
            this.registerObj(dObj);
        }
        this.analyseDependencies();
    }

    analyseDependencies()
    {
        //Now build up dependency links
        this.dependencies = { 
            dependencies: [], 
            add: function ( source, target ) { 
                if ( typeof target.expression === "object" )
                    target.expression.addDependencies( source, this );
                else if ( target instanceof DrawingObject )
                    this.dependencies.push( { source: source, target: target } ); 
            }  
        };
        
        for (var a = 0; a < this.drawingObjects.length; a++) 
        {
            var dObj = this.drawingObjects[a];
            dObj.setDependencies( this.dependencies );
        }
        //TODO use a d3.map of a d3.set when we build up the data and then convert it to an array
        //so that we can remove duplicates.
    }

    getObject(name) {
        if (typeof name === "object")
            return name;
        return this.drawing[name];
    }

    //TODO make this a static method of DrawingObject
    newDrawingObj(dObj) {
        if (dObj.objectType === "pointSingle")
            return new PointSingle(dObj);
        else if (dObj.objectType === "pointEndLine")
            return new PointEndLine(dObj);
        else if (dObj.objectType === "pointAlongLine")
            return new PointAlongLine(dObj);
        else if (dObj.objectType === "pointAlongPerpendicular")
            return new PointAlongPerpendicular(dObj);
        else if (dObj.objectType === "pointAlongBisector")
            return new PointAlongBisector(dObj);            
        else if (dObj.objectType === "pointFromXandYOfTwoOtherPoints")
            return new PointFromXandYOfTwoOtherPoints(dObj);
        else if (dObj.objectType === "pointIntersectLineAndAxis")
            return new PointIntersectLineAndAxis(dObj);
        else if (dObj.objectType === "line")
            return new Line(dObj);
        else if (dObj.objectType === "pointLineIntersect")
            return new PointLineIntersect(dObj);
        else if (dObj.objectType === "pointIntersectArcAndAxis")
            return new PointIntersectArcAndAxis(dObj);
        else if (dObj.objectType === "pointIntersectArcAndLine")
            return new PointIntersectArcAndLine(dObj);
        else if (dObj.objectType === "perpendicularPointAlongLine")
            return new PerpendicularPointAlongLine(dObj);
        else if (dObj.objectType === "pointOfTriangle")
            return new PointOfTriangle(dObj);            
        else if (dObj.objectType === "pointShoulder")
            return new PointShoulder(dObj);            
        else if (dObj.objectType === "arcSimple")
            return new ArcSimple(dObj);
        else if (dObj.objectType === "arcElliptical")
            return new ArcElliptical(dObj);
        else if (dObj.objectType === "splineSimple")
            return new SplineSimple(dObj);
        else if (dObj.objectType === "splineUsingPoints")
            return new SplineUsingControlPoints(dObj);
        else if (dObj.objectType === "splinePathInteractive")
            return new SplinePathInteractive(dObj);
        else if (dObj.objectType === "splinePathUsingPoints")
            return new SplinePathUsingPoints(dObj);
        else if (dObj.objectType === "cutSpline")   //SHOULD THIS BE pointCutSpline for consistency?
            return new CutSpline(dObj);
        else if (dObj.objectType === "pointCutSplinePath")
            return new PointCutSplinePath(dObj);      
        else if (dObj.objectType === "pointCutArc")
            return new PointCutArc(dObj);                              
        else if (dObj.objectType === "pointIntersectCurves")
            return new PointIntersectCurves(dObj);      
        else if (dObj.objectType === "pointIntersectCurveAndAxis")
            return new PointIntersectCurveAndAxis(dObj);      
        else if (dObj.objectType === "pointIntersectArcs")
            return new PointIntersectArcs(dObj);      
        else if (dObj.objectType === "pointIntersectCircles")
            return new PointIntersectCircles(dObj);                  
        else if (dObj.objectType === "operationMove")
            return new OperationMove(dObj);                  
        else if (dObj.objectType === "operationRotate")
            return new OperationRotate(dObj);                  
        else if (dObj.objectType === "operationFlipByAxis")
            return new OperationFlipByAxis(dObj);                  
        else if (dObj.objectType === "operationResult")
            return new OperationResult(dObj);                  
            

        throw( "Unsupported drawing object type:" + dObj.objectType );

        return null;
    }

    newFormula(formula) {

        //f.value()
        //f.html()

        var f = formula;
        if (typeof formula.constant !== "undefined") {
            f.value = function () {
                return this.constant;
            };
            f.html = function() {
                return this.constant;
            };
        }
        else if (typeof formula.expression === "object") {
            f.expression = new Expression( f.expression, this.pattern, this );
            f.value = function (currentLength) {
                return f.expression.value(currentLength);
            };
            f.html = function() {
                return f.expression.html();
            };
        }
        return f;
    }

    registerObj(dObj) {
        this.drawing[dObj.data.name] = dObj;
        dObj.patternPiece = this;
        if (typeof dObj.calculate !== "undefined") {
            //var getObject = this.getObject();
            dObj.calculate(this.bounds);
        }
    }

    pointSingle(data) {
        data.objectType = "pointSingle";
        var dObj = this.add( data );
        //var dObj = new PointSingle(data);
        //this.drawingObjects.push(dObj);
        //this.registerObj(dObj);
        return dObj;
    }

    add(data) {
        if (this.defaults) {
            for (var d in this.defaults) {
                if (typeof data[d] === "undefined")
                    data[d] = this.defaults[d];
            }
        }
        var dObj = this.newDrawingObj(data);
        this.drawingObjects.push(dObj);
        this.registerObj(dObj);
        return dObj;
    }

    setDefaults(defaults) {
        this.defaults = defaults;
    }
}


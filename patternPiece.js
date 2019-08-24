
class PatternPiece {

    constructor (data) {
        this.data = data;
        this.drawing = {};

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
    }

    getObject(name) {
        if (typeof name === "object")
            return name;
        return this.drawing[name];
    }

    newDrawingObj(dObj) {
        if (dObj.objectType === "pointSingle")
            return new PointSingle(dObj);
        else if (dObj.objectType === "pointEndLine")
            return new PointEndLine(dObj);
        else if (dObj.objectType === "pointAlongLine")
            return new PointAlongLine(dObj);
        else if (dObj.objectType === "line")
            return new Line(dObj);
        else if (dObj.objectType === "pointLineIntersect")
            return new PointLineIntersect(dObj);
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
            f.expression = new Expression(f.expression);
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

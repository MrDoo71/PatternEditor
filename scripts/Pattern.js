//(c) Copyright 2019 Jason Dore
//https://github.com/MrDoo71/PatternEditor

class Pattern {

    constructor (data, options ) {
        this.data = data;
        this.options = options;
        this.patternData = data.pattern;
        this.variable = {};
        this.measurement = {};
        this.units = this.patternData.units ? this.patternData.units : "cm";
        this.wallpapers = data.wallpaper;
        this.patternNumberAndName = ( this.patternData.patternNumber ? this.patternData.patternNumber + " ": "" ) + this.patternData.name;
        this.bounds = new Bounds();
        this.visibleBounds = new Bounds();

        if ( typeof this.patternData.measurement !== "undefined" )
        {
            for ( const m of this.patternData.measurement ) {

                //TODO test this variable that is a simple value...            
                if (typeof m.value !== "undefined") 
                {
                    m.constant = m.value;
                    m.value = function () {
                        return this.constant; 
                    };
                    m.html = function() {
                        return this.name + ": " + this.constant + " " + this.units;
                    };                    
                }
                else
                {
                    m.expression = new Expression( m.expression, this, null );
                    m.value = function () {
                        return this.expression.value(); 
                    };
                    m.html = function(asFormula) {
                        return this.name + ": " + this.expression.html( asFormula );
                    };
                }
                this.measurement[ m.name ] = m;
                m.isMeasurement = true;
            }
        }        
        
        if ( typeof this.patternData.variable !== "undefined" )
        {
            //Register all variable before calculating their values in to deal with dependencies.
            for ( const v of this.patternData.variable ) {
                this.variable[ v.name ] = v;
                v.isVariable = true;
            }

            //Now the variable are all registered, calculate their values.
            for ( const v of this.patternData.variable ) { 
                 
                //TODO test this variable that is a simple value...            
                if (typeof v.constant !== "undefined") 
                {
                    v.value = function () {
                        return this.constant;
                    };
                    v.html = function() {
                        return this.name + ": " + this.constant + ( this.isOverridden ? " (custom)" : "" ) 
                    };
                }
                else
                {
                    v.expression = new Expression( v.expression, this, null );
                    v.value = function () {
                        return this.expression.value();
                    };
                    v.html = function(asFormula) {
                        return this.name + ": " + this.expression.html( asFormula ) + " = " + Number.parseFloat( this.value() ).toPrecision(4) ;
                    };
                }
            }
        }        

        this.drawings = [];

        //Cater for older JSON
        if ( this.patternData.patternPiece )
            this.patternData.drawing = this.patternData.patternPiece;

        for( const drawing of this.patternData.drawing )
        {
            this.drawings.push( new PatternDrawing( drawing, this ) );
        }   

        this.analyseDependencies();
    }


    //Return the pattern local equivalent of this number of mm
    getPatternEquivalentOfMM( mm )
    {
        switch( this.units )
        {
            case "mm" : return mm; 
            case "cm" : return mm/10;
            default: return mm/25.4;
        }
    }


    analyseDependencies() {
        //Now build up dependency links
        this.dependencies = { 
            dependencies: [], 
            add: function ( source, target ) { 

                if (( ! source ) || ( ! target ))
                    return;

                if (   ( target && typeof target.expression === "object" )
                    && ( ! target.isMeasurement )
                    && ( ! target.isVariable ) )
                {
                    if ( target.expression.addDependencies )
                        target.expression.addDependencies( source, this );
                    else
                        console.log("Failed to add dependency for expression. Presumably due to earlier errors. "); //nb. the expression is likely the original data, not our expression object
                }
                else if (   ( target instanceof DrawingObject )
                         || ( target.isMeasurement )
                         || ( target.isIncrement ) 
                         || ( target.isVariable ) 
                         )
                    this.dependencies.push( { source: source, target: target } ); 
            }  
        };
        
        if ( this.variable )
        {
            //nb this.variable is on object with variables as properties, not an array
            for( const i in this.variable )
            {
                const v = this.variable[i];
                if ( v.expression ) 
                {
                    if ( typeof v.expression.addDependencies === "function" )
                        v.expression.addDependencies( v, this.dependencies );
                    else
                        //cater for an variable invalidly having a constant and an expression
                        console.log( "v.expression does not have addDependencies " );
                }
            }
        }    
    
        for( const drawing of this.drawings )
        {
            for ( const dObj of drawing.drawingObjects ) 
            {
                dObj.setDependencies( this.dependencies );
            }

            for ( const p of drawing.pieces ) 
            {
                p.setDependencies( this.dependencies );
            }
        }
        //TODO use a d3.map of a d3.set when we build up the data and then convert it to an array
        //so that we can remove duplicates.
    }


    getVariable(name) {
        if (typeof name === "object")
            return name;
        return this.variable[name];
    }

    getMeasurement(name) {
        if (typeof name === "object")
            return name;

        const m = this.measurement[name];

        if ( !m )
            throw "Measurment not found:" + name;

        return m;
    }

    getObject( name )
    {
        for( const drawing of this.drawings )
        {
            const obj = drawing.getObject( name, true /*restrict search to this piece*/ );
            if ( obj )
                return obj;
        }
        return null;
    }


    getDate() {
        const t = new Date();
        const date = ('0' + t.getDate()).slice(-2);
        const month = ('0' + (t.getMonth() + 1)).slice(-2);
        const year = t.getFullYear();
        return `${year}-${month}-${date}`;
    }
}
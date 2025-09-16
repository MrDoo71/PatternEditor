

class SplinePathInteractive extends DrawingObject {

    constructor(data) {
        super(data);

        if ( typeof this.data.name === "undefined" )
            this.data.name = this.data.derivedName;        
    }


    calculate(bounds) {
        const d = this.data;

        if ( typeof this.nodes === "undefined" )
        {
            this.nodes = [];

            try {
                for( const pathNode of d.pathNode )
                {
                    pathNode.point   = this.drawing.getObject( pathNode.point );
                    pathNode.angle1  = this.drawing.newFormula( pathNode.angle1 ); 
                    pathNode.length1 = this.drawing.newFormula( pathNode.length1 ); 
                    pathNode.angle2  = this.drawing.newFormula( pathNode.angle2 ); 
                    pathNode.length2 = this.drawing.newFormula( pathNode.length2 );

                    pathNode.controlPoint1 = this.getControlPoint( pathNode.point.p, pathNode.length1, pathNode.angle1 );
                    pathNode.controlPoint2 = this.getControlPoint( pathNode.point.p, pathNode.length2, pathNode.angle2 );

                    const divergenceFromStraightLine = Math.abs( pathNode.angle1.value() - pathNode.angle2.value() ) - 180;
                    const controlPointsInAStraightLine = Math.abs( divergenceFromStraightLine ) < 1;

                    console.log( divergenceFromStraightLine + " " + controlPointsInAStraightLine );

                    if ( controlPointsInAStraightLine )
                    {
                        pathNode.controlPoint1.straightLineWith = pathNode.controlPoint2;
                        pathNode.controlPoint2.straightLineWith = pathNode.controlPoint1;
                    }

                    pathNode.original = { controlPoint1 : { ...pathNode.controlPoint1 }, 
                                          controlPoint2 : { ...pathNode.controlPoint2 } };
                                          
                    if ( pathNode.original.controlPoint1.straightLineWith )
                        pathNode.original.controlPoint1.straightLineWith = pathNode.original.controlPoint2;
                    if ( pathNode.original.controlPoint2.straightLineWith )
                        pathNode.original.controlPoint2.straightLineWith = pathNode.original.controlPoint1;

                    this.nodes.push( { inControlPoint: pathNode.controlPoint1,
                                       point: pathNode.point.p,
                                       outControlPoint: pathNode.controlPoint2
                                       } );
                }
            } catch ( e ) {
                this.error = e;
                return;
            }
        }

        this.setCurve();

        this.midPoint = this.curve.pointAlongPathFraction( 0.5 );        
        this.p = this.midPoint;
        this.adjustBounds( bounds );
    }


    setCurve()
    {
        this.curve = new GeoSpline( this.nodes );
    }


    adjustBounds( bounds )
    {
        bounds.adjust( this.p );
        this.curve.adjustBounds( bounds );
    }

    
    asShapeInfo()
    {
        return this.curve.asShapeInfo();
    }


    draw( g, drawOptions ) {

        this.drawCurve(g, drawOptions );

        //Where should we draw the label? half way along the curve? 
        this.drawLabel(g, drawOptions );
    }


    pointAlongPath( length ) {
        return this.curve.pointAlongPath( length );
    }   


    html( asFormula ) {
        let html = this.nameOf() + ': '
                    +'curved path:';

        const d = this.data;
        
        try {
            let thtml = "<table><tbody>";
            for( const i in d.pathNode )
            {
                const node = d.pathNode[i];
                thtml += "<tr><td>";
                thtml += this.refOf( node.point );
                thtml += "</td>";

                if ( i == 0 )
                    thtml += "<td></td><td></td>";
                else
                    thtml +=    "<td>" + node.angle1.htmlAngle( asFormula ) 
                            + "</td><td>" + node.length1.htmlLength( asFormula ) + "</td>";

                if ( i == (d.pathNode.length -1) )
                    thtml += "<td></td><td></td>";
                else
                    thtml +=    " <td>" + node.angle2.htmlAngle( asFormula ) 
                            + "</td><td>" + node.length2.htmlLength( asFormula ) + "</td>";

                thtml += "</tr>";         
            }
            thtml += "</tbody></table>";
            html += thtml;
        } catch ( e ) {
            if ( ! this.error )
                html += e;
        }

        return html;
    }

    
    setDependencies( dependencies )
    {
        for( const pathNode of this.data.pathNode )
        {
            dependencies.add( this, pathNode.point );
            dependencies.add( this, pathNode.angle1 );
            dependencies.add( this, pathNode.angle2 );
            dependencies.add( this, pathNode.length1 );
            dependencies.add( this, pathNode.length2 );
        }        
    }    


    revert()
    {
        const d = this.data;
        this.nodes = [];
        for( const pathNode of d.pathNode ) 
        {
            pathNode.controlPoint1 = { ...pathNode.original.controlPoint1 };
            pathNode.controlPoint2 = { ...pathNode.original.controlPoint2 };

            if ( pathNode.controlPoint1.straightLineWith )
                pathNode.controlPoint1.straightLineWith = pathNode.controlPoint2;
            if ( pathNode.controlPoint2.straightLineWith )
                pathNode.controlPoint2.straightLineWith = pathNode.controlPoint1;

            this.nodes.push( {  inControlPoint: pathNode.controlPoint1,
                                point:     pathNode.point.p,
                                outControlPoint: pathNode.controlPoint2
                                } );            
        }
        this.setCurve();
    }


    getControlPoints() 
    {
        const controlPoints = [];
        //let seq = 0;
        for( const n of this.nodes )
        {
            const cp1 = { obj: this, bp: n.point, cp: n.inControlPoint };
            const cp2 = { obj: this, bp: n.point, cp: n.outControlPoint };
            cp1.partnerOf = cp2;
            cp2.partnerOf = cp1;
            controlPoints.push( cp1 );
            controlPoints.push( cp2 );
        }
        return controlPoints;
    }


    getControlPointDataForUpdate() 
    {
        //calculate length and angle of the modified control points

        const data = {
            ControlPoints: [] };
 
        for( const n of this.nodes )
        {
            const line1 = new GeoLine( n.point, n.inControlPoint );
            const line2 = new GeoLine( n.point, n.outControlPoint );
        
            data.ControlPoints.push( 
                {
                    //Sequence: ++seq, 
                    inAngle: Number( line1.angleDeg().toPrecision(8) ),
                    inLength: Number( line1.getLength().toPrecision(8) ), 
                    outAngle: Number( line2.angleDeg().toPrecision(8) ),
                    outLength: Number( line2.getLength().toPrecision(8) ) 
                } );                
        }
        return data;
    }        
}

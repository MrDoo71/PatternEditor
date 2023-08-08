/*define(function (require) {
    require('./DrawingObject');
    require('../geometry');
});*/

class SplinePathInteractive extends DrawingObject {

    constructor(data) {
        super(data);

        if ( typeof this.data.name === "undefined" )
            this.data.name = this.data.derivedName;        
    }


    calculate(bounds) {
        var d = this.data;

        if ( typeof this.nodes === "undefined" )
        {
            this.nodes = [];

            try {
                for( var i=0; i< d.pathNode.length; i++ )
                {
                    var pathNode = this.data.pathNode[i];

                    pathNode.point   = this.drawing.getObject( pathNode.point );
                    pathNode.angle1  = this.drawing.newFormula( pathNode.angle1 ); 
                    pathNode.length1 = this.drawing.newFormula( pathNode.length1 ); 
                    pathNode.angle2  = this.drawing.newFormula( pathNode.angle2 ); 
                    pathNode.length2 = this.drawing.newFormula( pathNode.length2 );

                    this.nodes.push( { inAngle:   pathNode.angle1.value(),
                                       inLength:  pathNode.length1.value(),
                                       point:     pathNode.point.p,
                                       outAngle:  pathNode.angle2.value(),
                                       outLength: pathNode.length2.value() } );
                }
            } catch ( e ) {
                this.error = e;
                return;
            }
        }

        this.curve = new GeoSpline( this.nodes );

        this.midPoint = this.curve.pointAlongPathFraction( 0.5 );        
        this.p = this.midPoint;
        this.adjustBounds( bounds );
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
        var html = '<span class="ps-name">' + this.data.name + '</span>: '
                    +'curved path:';

        var d = this.data;
        
        try {
            var thtml = "<table><tbody>";
            for( var i=0; i< d.pathNode.length; i++ )
            {
                thtml += "<tr><td>";
                thtml += this.refOf( d.pathNode[i].point );
                thtml += "</td>";

                if ( i == 0 )
                    thtml += "<td></td><td></td>";
                else
                    thtml +=    "<td>" + d.pathNode[i].angle1.htmlAngle( asFormula ) 
                            + "</td><td>" + d.pathNode[i].length1.htmlLength( asFormula ) + "</td>";

                if ( i == (d.pathNode.length -1) )
                    thtml += "<td></td><td></td>";
                else
                    thtml +=    " <td>" + d.pathNode[i].angle2.htmlAngle( asFormula ) 
                            + "</td><td>" + d.pathNode[i].length2.htmlLength( asFormula ) + "</td>";

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
        for( var i=0; i< this.data.pathNode.length; i++ )
        {
            var pathNode = this.data.pathNode[i];
            dependencies.add( this, pathNode.point );
            dependencies.add( this, pathNode.angle1 );
            dependencies.add( this, pathNode.angle2 );
            dependencies.add( this, pathNode.length1 );
            dependencies.add( this, pathNode.length2 );
        }        
    }    
}

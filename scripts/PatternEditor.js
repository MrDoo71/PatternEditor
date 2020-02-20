//(c) Copyright 2019 Jason Dore
//Inspired by the excellent seamly2D/Valentina (XXX ref) developed by Roman/Susan etc.
//this is a ground up implementation in Javascript intended to be compatible with, but
//not based on, the seamly2D/Valentina pattern making systen in order to support community
//pattern sharing website. 

var selectedObject;
var linksGroup;

function drawPattern( dataAndConfig, ptarget, options ) 
{
    //Remove the svg if called by graph_kill
    if ( dataAndConfig === null )
    {
        var parent = document.getElementById(ptarget).parentNode;
        var child = document.getElementById(ptarget);
        parent.removeChild(child);
        return ;
    } 

    //This is a graph initialisation

    var pattern = new Pattern( dataAndConfig, options );
      
    pattern.gInteractionPrefix = options.interactionPrefix;    
    
    function newkvpSet(noRefresh)
    {
        var kvp = { } ;
        kvp.kvps = new Array() ;

        kvp.add = function (k, v)
        {
            this.kvps.push ( {k: k, v: v} ) ;
        } ;

        kvp.toString = function (p)
        {
            var r = '' ;

            for (var i = 0 ; i < this.kvps.length ; i++)
            {
                r += '&' + p + this.kvps[i].k + '=' + this.kvps[i].v ;
            }

            return r ;
        } ;

        if (noRefresh)
            kvp.add("_noRefresh", -1) ;

        return kvp ;
    }
    
    // show menu on right-click.
    var contextMenu = function(d) {
   		d3.event.preventDefault() ;
    	var v = newkvpSet(false) ;
    	v.add("x", d.x) ;   
    	v.add("y", d.y) ;    
    	goGraph( gInteractionPrefix + ':' + d.data.contextMenu ,
    			 d3.event, 
    			 v ) ;
    }      
    
    var targetdiv = d3.select( "#" + ptarget )
                       .append( "div" )
                       .attr( "class", "pattern-editor" );

    dataAndConfig.options.layoutConfig = { drawingWidth: 400,
                                           drawingHeight: 600,
                                           drawingMargin: 0,//25,
                                           tableWidth: 400,
                                           tableHeight: 600,
                                           tableMargin: 0 };//25 };

    dataAndConfig.options.setButton = function( viewOption ) {
        //alert("Click ! " + viewOption.label );

        if ( ! viewOption )
           viewOption = this.layoutConfig.viewOption;

        var totalWidth = viewOption.drawingWidth + viewOption.descriptionsWidth; //should be tableWidth
        var availableWidth = targetdiv.style('width').slice(0, -2) -30;// 1000;
        var availableHeight= window.innerHeight - targetdiv.node().getBoundingClientRect().top -60/*controlpanel buttons height*/;
        this.layoutConfig.drawingWidth = availableWidth * viewOption.drawingWidth / totalWidth;
        this.layoutConfig.tableWidth   = availableWidth * viewOption.descriptionsWidth / totalWidth;
        this.layoutConfig.drawingHeight = availableHeight;
        this.layoutConfig.tableHeight = availableHeight;
        this.layoutConfig.viewOption = viewOption; //so we can call this without a parameter when toggling full size. 
    };    

    dataAndConfig.options.setButton( dataAndConfig.options.viewOption[1] );

    var doDrawingAndTable = function() {
                                    if ( dataAndConfig.options.layoutConfig.drawingWidth )
                                        doDrawing( targetdiv, pattern.patternPiece1, dataAndConfig.options, contextMenu );
                                    else
                                        targetdiv.select("svg.pattern-drawing").remove();

                                    if ( dataAndConfig.options.layoutConfig.tableWidth )
                                        doTable( targetdiv, pattern.patternPiece1, dataAndConfig.options.layoutConfig, contextMenu );
                                    else
                                        targetdiv.select("div.pattern-table").remove();
                                };

    doControls( targetdiv, dataAndConfig.options, doDrawingAndTable );
    doDrawingAndTable();                            
}


function doControls( graphdiv, editorOptions, doDrawingAndTable )
{
    if ( ! editorOptions )
        return;

    var controls = graphdiv.append("div").attr("class", "pattern-editor-controls")

    if (    ( editorOptions.viewOption )
         && ( editorOptions.viewOption.length > 0 ) )
    {
        var sizeButtons = controls.append("div").attr("class", "btn-group view-options");
        sizeButtons.selectAll("button")
                    .data( editorOptions.viewOption )
                    .enter()
                    .append("button")
                    .attr( "class", "btn btn-default" )
                    .text(function(d) { return d.label; })
                    .on("click", function(d) {
                        editorOptions.setButton( d );
                        doDrawingAndTable();
                    } );
    }

    if ( editorOptions.includeFullPageOption )
    {
        var toggleFullScreen = function() {

            if ( graphdiv.classed("full-page") ) 
                graphdiv.node().classList.remove("full-page");
            else
                graphdiv.node().classList.add("full-page");

            editorOptions.setButton();
            doDrawingAndTable();
        };

        var fullPageButton = controls.append("button")
                                     .attr("class", "btn btn-default toggle-full-page")
                                     .text( "full" )
                                     .on("click", toggleFullScreen );
    }

}


//Do the drawing... (we've added draw() to each drawing object.
function doDrawing( graphdiv, patternPiece1, editorOptions, contextMenu )
{
    var layoutConfig = editorOptions.layoutConfig;
    var margin = layoutConfig.drawingMargin;//25; 
    var width =  layoutConfig.drawingWidth;//400;
    var height = layoutConfig.drawingHeight;//600;

    graphdiv.select("svg.pattern-drawing").remove();

    var svg = graphdiv.append("svg")
                       .attr("class", "pattern-drawing" )
                       .attr("width", width + ( 2 * margin ) )
                       .attr("height", height + ( 2 * margin ));

    var transformGroup1 = svg.append("g")
                            .attr("transform", "translate(" + ( margin ) + "," + ( margin ) + ")");

    var scaleX = width / ( patternPiece1.bounds.maxX - patternPiece1.bounds.minX );                   
    var scaleY = height / ( patternPiece1.bounds.maxY - patternPiece1.bounds.minY );           
    
    if ( ( isFinite( scaleX ) ) && ( isFinite( scaleY ) ) )
        scale = scaleX > scaleY ? scaleY : scaleX;
    else if ( isFinite( scaleX ) )
        scale = scaleX;
    else
        scale = 1;

    var transformGroup2 = transformGroup1.append("g")
                               .attr("transform", "scale(" + scale + "," + scale + ")");

    var transformGroup3 = transformGroup2.append("g")
                               .attr("transform", "translate(" + ( ( -1.0 * patternPiece1.bounds.minX ) ) + "," + ( ( -1.0 * patternPiece1.bounds.minY ) ) + ")");

    //TODO also need to be able to click on a line / curve/ arc

    var onclick = function(d) {
        d3.event.preventDefault() ;
        console.log( "Click! " );
        $( ".j-active" ).removeClass("j-active");
        $( ".j-item.source" ).removeClass("source");
        $( ".j-item.target" ).removeClass("target");
        $(this).addClass("j-active");
        d.tableSvg.each( function(d,i) {
            $(this).addClass("j-active");
        });
        selectedObject = d;
        //drawLinks( patternPiece1 );

        linksGroup.selectAll("path.link") //rename .link to .dependency
            .attr("class", function( d ) {                         
                if ( d.source == selectedObject ) 
                {
                    d.target.tableSvg.each( function() { $(this).addClass("source"); } );
                    return "source link";
                }
                if ( d.target == selectedObject ) 
                {
                    d.source.tableSvg.each( function() { $(this).addClass("target"); } );
                    return "target link";
                }
                return "link"; 
            } );
    }

    var a = transformGroup3.selectAll("g");    
    a = a.data( patternPiece1.drawingObjects );
    a.enter()
     .append("g")
     .each( function(d,i) {
        var g = d3.select( this );
        //d.calculate();

        d.drawingSvg = g;

        g.on("contextmenu", contextMenu);
        g.on("click", onclick);

        if ( typeof d.draw === "function" )
            d.draw( g );
    });

    var zoomed = function() {
        transformGroup1.attr("transform", d3.event.transform);
    };           

    if ( editorOptions.allowPanAndZoom )
    {
        svg.call(d3.zoom()
            .extent([[0, 0], [width, height]])
            .scaleExtent([1, 8])
            .on("zoom", zoomed));
    }


    //Enable Pan and Zoom
    //https://observablehq.com/@d3/zoom
    //TODO if a point is selected then zoom with it as the focus
    //SEE https://bl.ocks.org/mbostock/a980aba1197350ff2d5a5d0f5244d8d1
    /*
    function zoomed() {
        transformGroup.attr("transform", d3.event.transform);
    }; this doesn't quite work well enough
    svg.call(d3.zoom()
        .extent([[0, 0], [width, height]])
        .scaleExtent([1, 8])
        .on("zoom", zoomed));
    */
}


function doTable( graphdiv, patternPiece1, layoutConfig, contextMenu )
{
    var margin = layoutConfig.tableMargin;//25; 
    var width =  layoutConfig.tableWidth;//400;
    var height = layoutConfig.tableHeight;//600;
    var minItemHeight = 30; //should not be required
    var itemMargin = 8;
    var itemWidth = width *3/4;
    var ypos = 0;
    var seq = 1; //TODO get these in the XML as data?

    graphdiv.select("div.pattern-table").remove();

    var svg = graphdiv.append("div")
                      .attr("class", "pattern-table")
                      .style( "height", height +"px" )    
                      .append("svg")
                      .attr("width", width + ( 2 * margin ) )
                      .attr("height", minItemHeight * patternPiece1.drawingObjects.length );    

    var a = svg.selectAll("g");
    a = a.data( patternPiece1.drawingObjects );
    a.enter()        
     .append("g")
     .each( function(d,i) {

        var divHeight = function(that) {

            //this - the dom svg element
            //that - the data object

            //console.log( "divHeight() of this:" + this + " that:" + that );

            //var div = $(this).find( "div.nodedesc" );
            var h = $(this).find( "div.outer" ).height();
            
            if ( h < minItemHeight )
                return minItemHeight;
            return h;
            
        };

        var g = d3.select( this );

        g.attr( "class", "j-item") ;

        d.tableSvg = g;
        d.tableSvgX = itemWidth;
        d.tableSvgY = ypos + ( 0.5 * minItemHeight );

        var fo = g.append( "foreignObject" )
         .attr( "x", 0 )
         .attr( "y", function (d) { 
             return ypos;
         } )
         .attr( "width", itemWidth  );

         var div = fo.append( "xhtml:div" )
           .attr("class","outer")
           .append( "xhtml:div" )
           .attr("class","desc")
           .html( d.html() );

        fo.attr( "height", 1 ); //required by firefox otherwise bounding rects returns nonsense
        fo.attr( "height", divHeight );

        g.attr( "height", divHeight )
         .attr( "y", function (d) { 
                                    //Get the height of the foreignObject.
                                    var h = this.childNodes[0].getBoundingClientRect().height;
                                    ypos += h + itemMargin; 
                                    //console.log("y: " + ypos );
                                    return ypos } )

        g.on("contextmenu", contextMenu);
    });                   
    
    svg.attr("height", ypos );    

    linksGroup = svg.append("g")
                    .attr("class", "links");

    //Links area is width/4 by ypos.            
    var linkScale = (width/4) / Math.log( Math.abs( ypos /30 ) );   
    drawLinks( patternPiece1, linkScale );
}


function drawLinks( patternPiece, linkScale )
{
    var linkData = patternPiece.dependencies.dependencies;

    linksGroup.selectAll("path.link") //rename .link to .dependency
                    .data(linkData)
                    .enter().append("path")
                    .attr("class", "link" )
                    .attr("d", function( link ) {
                        var x0 = link.source.tableSvgX, y0 = link.source.tableSvgY,
                            x1 = link.target.tableSvgX, y1 = link.target.tableSvgY;
                    
                        var dx = x0 - x1,
                            dy = y0 - y1,
                            l = Math.log( Math.abs(dy /30 ) ) * linkScale;
                    
                        var path = d3.path();
                        path.moveTo( x0, y0 );
                        path.bezierCurveTo( x0+l , y0, x1+l, y1, x1, y1 );
                        return path;                      
                    } );
                    //.attr("d", curve);
}


/*
 * Curve that connects items in the table.
 */
function curve(link) {
    var x0 = link.source.tableSvgX, y0 = link.source.tableSvgY,
        x1 = link.target.tableSvgX, y1 = link.target.tableSvgY;

    var dx = x0 - x1,
        dy = y0 - y1,
        l = Math.log( Math.abs(dy /30 ) ) * 50;

    var path = d3.path();
    path.moveTo( x0, y0 );
    path.bezierCurveTo( x0+l , y0, x1+l, y1, x1, y1 );
    return path;                      
}


export{ PatternPiece, doDrawing, doTable, drawPattern  };
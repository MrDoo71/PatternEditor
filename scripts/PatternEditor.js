//(c) Copyright 2019-20 Jason Dore
//
//Inspired by the excellent Seamly2D/Valentina pattern drawing software.
//This library is a ground up implementation in Javascript intended to be compatible with, but
//not based on, the Seamly2D/Valentina pattern making systen in order to support the community
//pattern sharing website https://my-pattern.cloud/ . 
//
//Source maintained at: https://github.com/MrDoo71/PatternEditor

let selectedObject;
let linksGroup;
let fontsSizedForScale = 1;
let fontResizeTimer;
let updateServerTimer;
let timeOfLastTweak;
let doDrawingAndTable;

function drawPattern( dataAndConfig, ptarget, graphOptions ) 
{
    //Remove the svg if called by graph_kill
    if ( dataAndConfig === null )
    {
        const parent = document.getElementById(ptarget).parentNode;
        const child = document.getElementById(ptarget);
        parent.removeChild(child);
        return ;
    } 

    //This is a graph initialisation

    if ( ! dataAndConfig.options )
        dataAndConfig.options = {};

    const options = dataAndConfig.options;

    options.interactionPrefix = graphOptions.interactionPrefix;

    const targetdiv = d3.select( "#" + ptarget )
                       .append( "div" )
                       .attr( "class", "pattern-editor" );

    let pattern;
    try {
        pattern = new Pattern( dataAndConfig, graphOptions );            
    } catch ( e ) {
        if ( ! options.thumbnail )
            targetdiv.append("div")
                .attr( "class", "alert alert-warning" )
                .text( "Pattern draw failed.");

        console.log("Failed to load pattern: ", e );

        try {
            const failMessage = 'FAIL:' + e.message;
            const failMessageHash = CryptoJS.MD5( failMessage ).toString();

            if (    ( options.reportFailure ) 
                 && ( options.returnID ) )
            {
                const kvpSet = newkvpSet(true);
                kvpSet.add( 'failureJSON', JSON.stringify( { error: e.message, lineNumber: e.lineNumber } ) );
                kvpSet.add( 'id', options.returnID ) ;
                goGraph( options.interactionPrefix + ':' + options.reportFailure, fakeEvent(), kvpSet);
            }
            else if (    ( options.returnSVG !== undefined ) 
                 && ( dataAndConfig.options.currentSVGhash !== failMessageHash )
                 && ( options.returnID ))
            {
                const kvpSet = newkvpSet(true);
                kvpSet.add( 'svg', failMessage );
                kvpSet.add( 'id', options.returnID ) ;
                goGraph( options.interactionPrefix + ':' + options.returnSVG, fakeEvent(), kvpSet);
            }
        } catch ( f ) {
        }
        
        return;
    }

    if ( options.allowPanAndZoom === undefined )
        options.allowPanAndZoom = true;

    if ( options.showFormulas === undefined )
        options.showFormulas = true;

    if ( options.drawingTableSplit === undefined )
        options.drawingTableSplit = 0.66;

    if ( options.skipDrawing === undefined )
        options.skipDrawing = false;

    if ( options.skipPieces === undefined )
        options.skipPieces = false;

    if ( options.thumbnail === undefined )
        options.thumbnail = false;

    if ( options.interactive === undefined )
        options.interactive = ! options.thumbnail;

    if ( options.lastMixedSplit === undefined )
        options.lastMixedSplit = options.drawingTableSplit > 0.0 && options.drawingTableSplit < 1.0 ? options.drawingTableSplit : 0.66;

    if ( ! options.viewOption )
        options.viewOption = [  { "mode":"drawing", "icon": "fa-regular fa-image",       "drawingTableSplit": 1.0 },
                                { "mode":"mixed",   "icon": "fa-solid fa-table-columns",       "drawingTableSplit": 0.5 },
                                { "mode":"table",   "icon": "fa-solid fa-align-justify", "drawingTableSplit": 0 } ];

    // show menu on right-click.
    const contextMenu = options.interactive && typeof goGraph === "function" ? function(d) {
        if ( d.contextMenu )
        {
            d3.event.preventDefault() ;
            const v = newkvpSet(false) ;
            v.add("x", d.x) ;   
            v.add("y", d.y) ;    
            goGraph( graphOptions.interactionPrefix + ':' + d.contextMenu ,
                    d3.event, 
                    v ) ;
        }
    } : undefined; //function(d){};     

    options.layoutConfig = { drawingWidth: 400,
                             drawingHeight: 600,
                             drawingMargin: 0,
                             tableWidth: 400,
                             tableHeight: 600,
                             tableMargin: 0 };

    if ( ! options.translateX )                                           
        options.translateX = 0;

    if ( ! options.translateY )                                           
        options.translateY = 0;

    if ( ! options.scale )                                           
        options.scale = 1;

    options.setDrawingTableSplit = function( drawingTableSplit ) { //can be called with a decimal (0.0 - 1.0), a mode ("drawing","mixed","table"), or nothing.

        //TODO if going full-screen and not specifying a split here, then keep the table the same width and give all extra space to the drawing
        
        if ( drawingTableSplit === undefined )
            drawingTableSplit = this.drawingTableSplit;
        else if ( drawingTableSplit === "drawing" )
            drawingTableSplit = 1.0;
        else if ( drawingTableSplit === "mixed" )
            drawingTableSplit = this.lastMixedSplit ? this.lastMixedSplit : 0.5;
        else if ( drawingTableSplit === "table" )
            drawingTableSplit = 0.0;

        if ( drawingTableSplit < 0.05 ) 
        {
            drawingTableSplit = 0.0;
            this.drawingTableSplitMode = "table";
        }
        else if ( drawingTableSplit > 0.95 ) 
        {
            drawingTableSplit = 1.0;
            this.drawingTableSplitMode = "drawing";
        }
        else
        {
            this.drawingTableSplitMode = "mixed";
            this.lastMixedSplit = drawingTableSplit;
        }

        let availableWidth = ( options.maxWidth ) ? options.maxWidth : Math.round( window.innerWidth - 30 -32 ); //30 for resize bar & 32 for scroll bars as not all systems hide scroll bars
        let availableHeight = ( options.maxHeight ) ? options.maxHeight : Math.round( window.innerHeight - targetdiv.node().getBoundingClientRect().top -60/*controlpanel buttons height*/);
        if ( this.fullWindow )
        {
            availableWidth -= 32; //left & right padding 
            availableHeight -= 30;
        }

        //console.log("setDrawingTableSplit availableWidth:" + availableWidth + " fullWindow:" + this.fullWindow + " drawingWidth:" + this.layoutConfig.drawingWidth );
        this.layoutConfig.drawingWidth = availableWidth * drawingTableSplit;
        this.layoutConfig.tableWidth   = availableWidth * (1-drawingTableSplit);
        this.layoutConfig.drawingHeight = availableHeight;
        this.layoutConfig.tableHeight = availableHeight;
        //console.log("setDrawingTableSplit split:" + drawingTableSplit + " availableWidth:" + availableWidth + " fullWindow:" + this.fullWindow + " drawingWidth:" + this.layoutConfig.drawingWidth );
        
        if ( this.sizeButtons )
        {
            const drawingTableSplitMode = this.drawingTableSplitMode;
            this.sizeButtons.selectAll("button")
                        .data( this.viewOption )
                        //.enter()
                        //.append("button")
                        .attr( "class",  function(d) { 
                            return d.mode === drawingTableSplitMode ? "btn btn-primary" : "btn btn-default" } );
        }

        if ( this.drawingTableSplit !== drawingTableSplit )
        {
            this.drawingTableSplit = drawingTableSplit; //so we can call this without a parameter when toggling full size. 
            if ( this.updateServer ) 
                this.updateServer(); 
        }
    };    

    options.updateServer = graphOptions.interactionPrefix && options.update ? function( k, x, y ) {
        if ( k )
        {
            if (    (options.translateX === x)
                 && (options.translateY === y)
                 && (options.scale === k) )
                 return;

            options.translateX = x;
            options.translateY = y;
            options.scale = k;
        }

        if ( $("div.popover").length )
        {
            console.log("Skipping server update as there is an overlay form. " );
            return;
        }

        console.log("Update server with pan: " + x + "," + y + " & zoom:" + k + " & options");
        const kvpSet = newkvpSet(true) ;
        kvpSet.add('fullWindow', options.fullWindow ) ;
        kvpSet.add('drawingTableSplit', options.drawingTableSplit ) ;
        kvpSet.add('scale', options.scale ) ;
        kvpSet.add('translateX', options.translateX ) ;
        kvpSet.add('translateY', options.translateY ) ;        
        goGraph( options.interactionPrefix + ':' + options.update, fakeEvent(), kvpSet) ;    
    } : undefined;

    if ( options.fullWindow )
        targetdiv.node().classList.add("full-page");

    options.setDrawingTableSplit( options.drawingTableSplit ); //shouln't cause a server update

    let focusDrawingObject = ! options.interactive ? undefined : function( d, scrollTable )
    {        
        if (    ( d3.event?.originalTarget?.className === "ps-ref" )
             && ( selectedObject === d )
             )
        {
            //Clicking on a reference to another drawing object, scroll to it. 
            selectedObject = d.drawing.getObject( d3.event.originalTarget.innerHTML );
            scrollTable = true;
        }
        else if (    ( d3.event?.srcElement?.className === "ps-ref" )
                  && ( selectedObject === d )
             )
        {
            //Clicking on a reference to another drawing object, scroll to it. 
            selectedObject = d.drawing.getObject( d3.event.srcElement.innerHTML );
            scrollTable = true;
        }
        else
        {
            //Not clicking on a reference, so we've selected what we clicked on
            selectedObject = d;
        }

        //Adjust the stoke width of related items in the drawing
        for( const drawing of pattern.drawings )
            for( const a of drawing.drawingObjects )
            {
                const g = a.drawingSvg;
                if ( g )
                {
                    const strokeWidth = a.getStrokeWidth( false, (selectedObject===a) );

                    g.selectAll( "line" )
                     .attr("stroke-width", strokeWidth );

                    g.selectAll( "path" )
                     .attr("stroke-width", strokeWidth );

                    g.selectAll( "ellipse" )
                     .attr("stroke-width", strokeWidth );
                }
            }        

        const graphdiv = targetdiv;

        //Remove any existing highlighting in the table. 
        $(graphdiv.node()).find( ".j-active" ).removeClass("j-active").removeClass("j-active-2s");
        $(graphdiv.node()).find( ".source" ).removeClass("source");
        $(graphdiv.node()).find( ".target" ).removeClass("target");

        //d, the drawing object we clicked on, has a direct reference to its representation in the table
        if ( selectedObject )
        {
            if ( selectedObject.tableSvg ) //should always be set unless there has been a problem
                selectedObject.tableSvg.node().classList.add("j-active");

            if ( selectedObject.drawingSvg )
                selectedObject.drawingSvg.node().classList.add("j-active");

            if ( selectedObject.outlineSvg )
            {
                selectedObject.outlineSvg.node().classList.add("j-active");
                const selectedObjectToAdjustAfter2Secs = selectedObject; //The user may have clicked on something else within 2 seconds
                //the blush will only last 2 seconds anyway, but if we don't do this then a second click whilst it is the active one doesn't repeat the blush
                setTimeout( function(){ selectedObjectToAdjustAfter2Secs.outlineSvg.node().classList.add("j-active-2s");}, 2000 );
            }
        }

        //Set the css class of all links to "link" "source link" or "target link" as appropriate.
        if ( linksGroup )
            linksGroup.selectAll("path.link") //rename .link to .dependency
                      .attr("class", function( d ) {
                        let classes = "link";
                        if ( d.source === selectedObject ) 
                        {
                            d.target.tableSvg.node().classList.add("source");

                            if ( d.target.outlineSvg ) //if it errored this will be undefined
                                d.target.outlineSvg.node().classList.add("source");

                            if ( d.target.drawingSvg ) //if it errored this will be undefined
                                d.target.drawingSvg.node().classList.add("source");

                            classes += " source";
                        }
                        if ( d.target === selectedObject ) 
                        {
                            d.source.tableSvg.node().classList.add("target");

                            if ( d.source.outlineSvg ) //if it errored this will be undefined
                                d.source.outlineSvg.node().classList.add("target");

                            classes += " target";
                        }
                        if ( d.source instanceof Piece )
                            classes += " piece";

                        return classes; 
                      } )
                      .each( function( d ) { 
                        if (( d.source === selectedObject ) || ( d.target === selectedObject ))
                            d3.select(this).raise();
                      } );

        //Scroll the table to ensure that d.tableSvg is in view.    
        if ( scrollTable && selectedObject )
        {
            if ( selectedObject.tableSvg )
            {
                const table = d3.select("div.pattern-table");
                table.transition()
                     .duration(500)
                     .tween("uniquetweenname", scrollTopTween( selectedObject.tableSvg.node().__data__.tableSvgY - ( table.node().getBoundingClientRect().height /2) ));
            }
            else
                console.log( "Cannot scroll table, no tableSvg - " + selectedObject.data.name );
        }

        if ( selectedObject instanceof Piece )
        {
            const piece = selectedObject;
            if ( piece.shown )
                piece.shown = false
            else
                piece.shown = true;

            //Toggle visibility of piece in the table
            if ( selectedObject.tableSvg ) //should always be set unless there has been a problem
            {
                const n = selectedObject.tableSvg.node();
                if (( piece.shown ) && ( ! n.classList.contains("shown")))
                    n.classList.add("shown");
                else if (( ! piece.shown ) && ( n.classList.contains("shown")))
                    n.classList.remove("shown");
            }

            //Toggle visibility of the piece in the drawing
            if ( selectedObject.svg ) //should always be set unless there has been a problem
            {
                const n = selectedObject.svg.node();
                if ( piece.shown )
                {  
                    piece.drawPiece( options );
                }
                else
                {
                    selectedObject.svg.selectAll( "path" ).remove();
                    selectedObject.svg.selectAll( "g" ).remove();
                }
            }
        }
        
        //TODO only if editable
        if (    ( selectedObject instanceof SplineSimple ) 
             || ( selectedObject instanceof SplinePathInteractive ) )
        {
            const controlPoints = selectedObject.getControlPoints();
        //TODO have a flag on a control point to indicate whether it is free in length and angle, angle only, or not at all 
        //based on whether the current value is a constant, or a formula

            selectedObject.controlPointData = controlPoints;

            const drag = d3.drag()
                .on("start", function (r) {
                    console.log("dragStart x " + d3.event.x + " y " + d3.event.y );                    
                    d3.select(this).raise();
                    d3.selectAll( "svg.pattern-drawing .confirmation-lozenge").remove();
                })
                .on("drag", function (r) {
                    //r is the data, this is the svg
                    const x = d3.event.x;
                    const y = d3.event.y;

                    //TODO if the angle was a formula, and the length wasn't then keep the angle
                    //whilst allowing the length to be changed

                    d3.select(this)
                        .attr("cx", x )
                        .attr("cy", y );

                    d3.select( this.parentNode )
                      .select( "line" )
                      .attr( "x2", x )
                      .attr( "y2", y );

                    const d3drawingG = d3.select( this.parentNode.parentNode );
                    d3drawingG.select( "path.edited-curve" ).remove(); 

                    r.cp.x = x;
                    r.cp.y = y;
                    r.obj.setCurve();
                    r.obj.draw( d3drawingG, { overrideLineStyle : "edited-curve" } );
                })
                .on("end", function (d) {
                    const funcYes = function() {
                        console.log("funcYes!*************" );
                        console.log(d);
                        const o = d.obj;                   
                        const dataJSON = JSON.stringify( o.getControlPointDataForUpdate() );
                        console.log( dataJSON );
                        const kvpSet = newkvpSet(false);
                        kvpSet.add( 'json', dataJSON );
                        goGraph( options.interactionPrefix + ':' + o.data.directUpdate, fakeEvent(), kvpSet);                        
                    };

                    const funcNo = function() {
                        console.log("funcNo!*************" );
                        console.log(d);
                        //restore the original curve.  
                        const o = d.obj;
                        o.revert();
                        o.drawingSvg.select( "path.edited-curve" ).remove();  
                        o.drawingSvg.selectAll( ".curve-control-point" ).remove();
                        o.draw( o.drawingSvg, {} );
                    };
                    drawConfirmationLozenge( d3.select(this.parentNode.parentNode), d3.event.x, d3.event.y, funcYes, funcNo );
                });

            const selectedD3 = selectedObject.drawingSvg;

            selectedD3.each(function(dp, i) {
                d3.select(this)
                    .selectAll( "g.curve-control-point" )
                    .data(dp.controlPointData)
                    .enter()
                    .append("g")
                    .attr("class", "curve-control-point" );
                });

            selectedD3
                .selectAll( "g.curve-control-point" )
                .each( function(d,i) { 
                    const d3this = d3.select(this);
                    
                    if ( d3this.select("line").size() === 0 )
                    {
                        d3this.append("line")
                            .attr("x1", d.bp.x )
                            .attr("y1", d.bp.y )
                            .attr("x2", d.cp.x )
                            .attr("y2", d.cp.y )
                            .attr("stroke-width", d.obj.getStrokeWidth( true, true ) );

                        d3this.append("circle")
                            .attr( "cx", d.cp.x )
                            .attr( "cy", d.cp.y )
                            .attr( "r", Math.round( 400  / scale ) /100 )
                            .call( drag );    
                    }
                } );
        }
    }; //focusDrawingObject

    let controls;
    if (( ! options.hideControls ) && ( options.interactive ))
        controls = doControls( targetdiv, options, pattern );

    const drawingAndTableDiv = targetdiv.append("div");
    
    if ( ! options.thumbnail ) 
        drawingAndTableDiv.attr("class", "pattern-main")

    doDrawingAndTable = function( retainFocus ) {
                                    if ( options.layoutConfig.drawingWidth )
                                        doDrawings( drawingAndTableDiv, pattern, options, contextMenu, controls, focusDrawingObject );
                                    else
                                        drawingAndTableDiv.select("svg.pattern-drawing").remove();
                                                                            
                                    if (   ( options.layoutConfig.drawingWidth )
                                        && ( options.layoutConfig.tableWidth ) )
                                        doResizeBar( drawingAndTableDiv, options );    
                                    else
                                        drawingAndTableDiv.select("div.pattern-editor-resize").remove();

                                    if ( options.layoutConfig.tableWidth )
                                        doTable( drawingAndTableDiv, pattern, options, contextMenu, focusDrawingObject );
                                    else
                                        drawingAndTableDiv.select("div.pattern-table").remove();

                                    if ( retainFocus )
                                        //e.g. if doing show/hide functions button
                                        focusDrawingObject( selectedObject, true );
                                };

    doDrawingAndTable();                   
    
    if (( options.returnSVG !== undefined ) && ( options.returnID ))
    {
        const serializer = new XMLSerializer();
        const xmlString = serializer.serializeToString( targetdiv.select('svg.pattern-drawing').node());        
        const thisHash = CryptoJS.MD5( xmlString ).toString();
        if ( options.currentSVGhash !== thisHash )
        {
            if ( xmlString.length > 64000 )
            {
                console.log("Thumnbnail SVG will be rejected as it is too large." );
            }
            else
            {
                const kvpSet = newkvpSet(true);
                kvpSet.add( 'svg', xmlString );
                kvpSet.add( 'id', options.returnID ) ;
                goGraph( options.interactionPrefix + ':' + options.returnSVG, fakeEvent(), kvpSet);
            }
        }
        else
        {
            console.log("Current thumbnail is still valid.");
        }
    }
    
    //If we have a download button, then add dimensions information for the download
    //Must be done after doing the drawing. 
    if ( options.downloadOption )
    {
        const svg = targetdiv.select("svg.pattern-drawing").node();
        controls.append("span")
            .text( " " + svg.getAttribute("width") + " x " + svg.getAttribute("height") );
    }        

    if ( ! options.interactive )
        return;

    let errorFound = false;
    let firstDrawingObject;
    for( const drawing of pattern.drawings )
    {
        for( const a of drawing.drawingObjects )
        {
            if (( firstDrawingObject === undefined ) && ( a.isVisible( options ) ))
                firstDrawingObject = a;

            if ( a.error )
            {
                focusDrawingObject(a, true);
                errorFound = true;
                break;
            }
        }
        if ( errorFound )
            break;
    }

    //if not focussing on an error then see if there is a recently edited item to focus on. 
    if ( ! errorFound )
    {
        if ( options.focus ) 
        {
            let a = pattern.getObject( options.focus );

            if ( ! a )
            try {
                a = pattern.getMeasurement( options.focus );
            } catch (e){
            }

            if ( ! a )
                a = pattern.getVariable( options.focus );

            if ( a )
                focusDrawingObject(a, true);
        }
        else
        {
            focusDrawingObject(firstDrawingObject, true);
        }
    }
}


function drawConfirmationLozenge( svg, x, y, funcyes, funcno )
{    
  d3.selectAll( "svg.pattern-drawing .confirmation-lozenge").remove();

  const lozenge = svg.append("g")
                     .attr("class", "confirmation-lozenge")
                     .attr("transform", "translate(" + x + "," + y + ") scale("+ (0.3/scale/fontsSizedForScale) + ")" );
  lozenge.append("rect")
    .attr("x", 0)
    .attr("y", 0)
    .attr("rx", 25)
    .attr("ry", 25)
    .attr("width", 160)
    .attr("height", 80)
    .attr("fill", "#f0f0f0")
    .attr("stroke", "#333")
    .attr("stroke-width", 2);

  // Tick icon (checkmark)
  const tickGroup = lozenge.append("g")
    .attr("transform", "translate(0, 0)")
    .on( "click", function(d,i) {
        console.log(  d );
        console.log( "i "  +i );
        console.log( "this "  + this );
        d3.event.preventDefault(); d3.event.stopPropagation();
        d3.select(this.parentNode).remove();
        d3.selectAll( "svg.pattern-drawing .confirmation-lozenge").remove();
        funcyes();
     });
  const crossGroup = lozenge.append("g")
    .attr("transform", "translate(0, 0)")
    .on( "click", function(d,i) {
        d3.event.preventDefault(); d3.event.stopPropagation();         
        d3.select(this.parentNode).remove();
        d3.selectAll( "svg.pattern-drawing .confirmation-lozenge").remove();
        funcno();
    });
  tickGroup.append("rect")
    .attr("x", 10)
    .attr("y", 5)
    .attr("width", 65)
    .attr("height", 70)
    .attr("fill", "transparent");  
  tickGroup.append("path")
    .attr("d", "M30 40 L40 50 L60 30")
    .attr("stroke", "green")
    .attr("stroke-width", 8)
    .attr("fill", "none")
    .attr("stroke-linecap", "round")
    .attr("stroke-linejoin", "round")    

  // Cross icon
crossGroup.append("rect")
  .attr("x", 80)
  .attr("y", 5)
  .attr("width", 70)
  .attr("height", 70)
  .attr("fill", "transparent");  
  crossGroup.append("line")
    .attr("x1", 110)
    .attr("y1", 30)
    .attr("x2", 130)
    .attr("y2", 50)
    .attr("stroke", "red")
    .attr("stroke-width", 8)
    .attr("stroke-linecap", "round");

  crossGroup.append("line")
    .attr("x1", 130)
    .attr("y1", 30)
    .attr("x2", 110)
    .attr("y2", 50)
    .attr("stroke", "red")
    .attr("stroke-width", 8)
    .attr("stroke-linecap", "round");    
}


function doResizeBar( graphdiv, editorOptions )
{
    const layoutConfig = editorOptions.layoutConfig;
    const drag = d3.drag()
    .on("start", function(r) {
        console.log("dragStart");
        const rg = d3.select(this);        
        r.initialX = d3.event.x;
        r.resizeBarBaseStyle = rg.attr("style");
    })
    .on("drag", function(r) {
        console.log("drag");
        const rg = d3.select(this);       
        rg.attr("style", r.resizeBarBaseStyle + " left:" + ( d3.event.x - r.initialX ) + "px;" ); 
    })
    .on("end", function(r){
        console.log("dragEnd: " + d3.event.x + " (" + ( d3.event.x - r.initialX ) + ")" );
        console.log( "layoutConfig:" + layoutConfig ); 
        const rg = d3.select(this);       
        rg.attr("style", r.resizeBarBaseStyle ); 
        const newDrawingWidth = layoutConfig.drawingWidth + ( d3.event.x - r.initialX );
        const newTableWidth  = layoutConfig.tableWidth - ( d3.event.x - r.initialX );
        editorOptions.setDrawingTableSplit( newDrawingWidth / ( newDrawingWidth + newTableWidth) );
        doDrawingAndTable();
    });

    const height = layoutConfig.drawingHeight;

    graphdiv.select( "div.pattern-editor-resize" ).remove();
    graphdiv.selectAll( "div.pattern-editor-resize" )
            .data( [ editorOptions ] )
            .enter()
            .append("div")
            .attr("class", "pattern-editor-resize")
            .attr("style", "height:" + height + "px;" )
            .call( drag );
}


function doControls( graphdiv, editorOptions, pattern )
{
    if ( ! editorOptions )
        return;

    const controls = graphdiv.append("div").attr("class", "pattern-editor-controls")

    if (    ( editorOptions.viewOption )
         && ( typeof editorOptions.viewOption === "object" ) //allow viewOption="drawing" to prevent display if these buttons
         && ( editorOptions.viewOption.length > 1 ) )
    {
        editorOptions.sizeButtons = controls.append("div").attr("class", "btn-group view-options");
        editorOptions.sizeButtons.selectAll("button")
                    .data( editorOptions.viewOption )
                    .enter()
                    .append("button")
                    .attr( "class",  function(d) { return d.mode === editorOptions.drawingTableSplitMode ? "btn btn-primary" : "btn btn-default" } )
                    .html(function(d) { return '<i class="' + d.icon + '"></i>'; })
                    .on("click", function(d) {
                        d3.event.preventDefault();
                        editorOptions.setDrawingTableSplit( d.mode );
                        doDrawingAndTable();
                    } );
    }

    if ( editorOptions.includeFullPageOption )
    {
        const toggleFullScreen = function() {
            d3.event.preventDefault();

            if ( graphdiv.classed("full-page") ) 
            {
                graphdiv.node().classList.remove("full-page");
                editorOptions.fullWindow = false;
            }
            else
            {
                graphdiv.node().classList.add("full-page");
                editorOptions.fullWindow = true;
            }

            editorOptions.setDrawingTableSplit();

            if ( editorOptions.updateServer ) 
                editorOptions.updateServer();

            doDrawingAndTable();
        };

        controls.append("button")
                .attr("class", "btn btn-default toggle-full-page")
                .html( '<i class="fa-solid fa-maximize" />' )
                .attr("title","Toggle full screen")
                .on("click", toggleFullScreen );
    }

    //Zoom to fit. 
    if ( editorOptions.allowPanAndZoom )
    {
        //zoomToFitButton
        controls.append("button")
            .attr("class", "btn btn-default zoom-to-fit")
            .html( '<i class="fa-solid fa-arrows-up-down-left-right" />' )
            .attr("title","Zoom to fit");
    }    

    if ( editorOptions.downloadOption )
    {
        const downloadFunction = function() {
            const serializer = new XMLSerializer();
            const xmlString = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\r\n" + serializer.serializeToString( graphdiv.select("svg.pattern-drawing").node() );
            const imgData = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xmlString);
            
            d3.select(this)
                .attr( "href-lang", "image/svg+xml; charset=utf-8" )
                .attr( "href", imgData )
                .attr( "download", pattern.patternNumberAndName +  ( editorOptions.targetPiece.name ? " - " + editorOptions.targetPiece.name : "" ) + " " + pattern.getDate() + ".svg" );
        };

        //downloadLink
        controls.append("a") //"button" does not work
                .attr("class", "btn btn-default download")
                .html( '<i class="fa-solid fa-download"></i> Download' )
                .attr("title","Download")
                .on("click", downloadFunction );
    }    

    if ( editorOptions.interactive )
    {
        const toggleShowFormulas = function() {
            d3.event.preventDefault();
            editorOptions.showFormulas = ! editorOptions.showFormulas;
            $(this).children("i").attr("class",editorOptions.showFormulas ? "fa-regular fa-square-check" : "fa-regular fa-square" );
            doDrawingAndTable( true /*retain focus*/ );
        };

        const optionMenuToggle = function() {
            d3.event.preventDefault();
            const $optionMenu = $( "#optionMenu");
            if ( $optionMenu.is(":visible")) $optionMenu.hide(); else $optionMenu.show();
        }

        const optionMenu = controls.append("div").attr("class","pattern-popup")
                                 .append("div").attr("id","optionMenu" ); //.css("display","visible")
        optionMenu.append("button").html( '<i class="fa-solid fa-xmark"></i>' ).on("click", optionMenuToggle );

        pattern.drawings.forEach( function(pp) {
            if ( ! pp.groups.length )
                return;
            const groupOptionsForPiece = optionMenu.append("section");
            groupOptionsForPiece.append("h2").text( pp.name );
            pp.groups.forEach( function(g) {
                const groupOption = groupOptionsForPiece.append("div").attr("class","group-option");
                const toggleGroup = function() {
                    g.visible = ! g.visible;  

                    if(( typeof goGraph === "function" ) && ( g.update ))
                    {
                        const kvpSet = newkvpSet(true) ;
                        kvpSet.add('visible', g.visible ) ;
                        goGraph(editorOptions.interactionPrefix + ':' + g.update, fakeEvent(), kvpSet) ;    
                    }

                    return g.visible;
                };
                groupOption.append( "i" ).attr("class",  g.visible ? 'fa-regular fa-eye' :'fa-regular fa-eye-slash' )
                           .on( "click", function() { 
                                            d3.event.preventDefault();
                                            const visible = toggleGroup();
                                            d3.select(this).attr("class",visible ? "fa-regular fa-eye" : "fa-regular fa-eye-slash" );
                                            doDrawingAndTable( true /*retain focus*/ );
                                } );
                groupOption.append( 'span' )
                           .text( g.name );
                if (( g.contextMenu ) && ( typeof goGraph === "function" ))
                groupOption.append( "i" ).attr("class",  "fa-solid fa-ellipsis k-icon-button" )           
                           .on( "click", function() { 
                            d3.event.preventDefault();
                            const v = newkvpSet(false) ;
                            goGraph( editorOptions.interactionPrefix + ':' + g.contextMenu, d3.event, v );
                            } );
            });
        });

        optionMenu.append("div").attr("class","formula-option").html( '<i class="fa-regular fa-square-check"></i>show formulas' ).on("click", toggleShowFormulas );

        if ( ! ( editorOptions.targetPiece && editorOptions.lifeSize ) ) //&& ! downloadOption ? 
            controls.append("button")
                    .attr("class","btn btn-default toggle-options").html( '<i class="fa-solid fa-circle-half-stroke"></i>' )
                    .attr("title","Group/formula visibility").on("click", optionMenuToggle );
    } //options menu to show/hide groups and show/hide formula

    if ( pattern.wallpapers )
    {
        initialiseWallpapers( pattern, editorOptions.interactionPrefix );

        const wallpaperMenuToggle = function() {
            d3.event.preventDefault();
            const $wallpaperMenu = $( "#wallpapersMenu");
            if ( $wallpaperMenu.is(":visible")) $wallpaperMenu.hide(); else $wallpaperMenu.show();
        }

        const wallpaperMenu = controls.append("div").attr("class","pattern-popup")
                                    .append("div").attr("id","wallpapersMenu" ); 
        wallpaperMenu.append("button").html( '<i class="fa-solid fa-xmark"></i>' ).on("click", wallpaperMenuToggle );
            
        let wallpaperListSection = wallpaperMenu.append("section");
        wallpaperListSection.append("h2").text( "Wallpapers" );
        wallpaperListSection = wallpaperListSection.append("ul");
        wallpaperListSection.selectAll("li")
            .data( pattern.wallpapers )
            .enter()
            .append("li")
            .attr( "class", function(w) { return w.hide ? 'wallpaper-hidden' : null; } )
            .each( function(wallpaper,i){                
                const wallpaperDiv = d3.select(this);

                
                wallpaperDiv.append( "span" ).html( function(w) { return w.hide ? '<i class="fa-regular fa-eye-slash"/>' : '<i class="fa-regular fa-eye"/>' } )
                                           .on("click", function(w) { d3.event.preventDefault(); d3.event.stopPropagation();
                                                                      w.hide = ! w.hide; 
                                                                      d3.select(this).html( w.hide ? '<i class="fa-regular fa-eye-slash"/>' : '<i class="fa-regular fa-eye"/>' );
                                                                      d3.select(this.parentNode).attr( "class", w.hide ? 'wallpaper-hidden' : null );
                                                                      w.updateServer();
                                                                      const wallpaperGroups = graphdiv.select( "g.wallpapers");
                                                                      doWallpapers( wallpaperGroups, pattern );                                                              
                                                                     } );
                wallpaperDiv.append( "span" ).html( function(w) { return w.editable ? '<i class="fa-solid fa-lock-open"/>' : w.allowEdit ? '<i class="fa-solid fa-lock"/>' : '<i class="fa-solid fa-lock disabled"/>' } )
                                           .on("click", function(w) { d3.event.preventDefault(); d3.event.stopPropagation();
                                                                      if ( w.allowEdit )
                                                                      {
                                                                        w.editable = ! w.editable; 
                                                                        d3.select(this).html( w.editable ? '<i class="fa-solid fa-lock-open"/>' : '<i class="fa-solid fa-lock"/>' );
                                                                        const wallpaperGroups = graphdiv.select( "g.wallpapers");
                                                                        doWallpapers( wallpaperGroups, pattern );                                                              
                                                                      }
                                                                     } );
                wallpaperDiv.append( "span" ).text( wallpaper.displayName );
                                                                     //fa-lock fa-lock-open fa-arrows-up-down-left-right fa-regular fa-eye fa-regular fa-eye-slash
            });            

        controls.append("button").attr("class","btn btn-default toggle-options").html( '<i class="fa-solid fa-camera-retro"></i>' ).attr("title","Wallpapers").on("click", wallpaperMenuToggle );
    } //wallpapers button    

    return controls;
}


function initialiseWallpapers( pattern, interactionPrefix )
{    
    let defaultScale = 72.0;

    const updateServer = ( typeof goGraph === "function" ) ? function(e) {
        const kvpSet = newkvpSet(true) ;
        kvpSet.add('offsetX', this.offsetX ) ;
        kvpSet.add('offsetY', this.offsetY ) ;
        kvpSet.add('scaleX', this.scaleX * defaultScale ) ;
        kvpSet.add('scaleY', this.scaleY * defaultScale ) ;
        kvpSet.add('opacity', this.opacity ) ;
        kvpSet.add('visible', ! this.hide ) ;
        goGraph(interactionPrefix + ':' + this.update, fakeEvent(), kvpSet) ;    
    } : function(e){};

    const wallpapers = pattern.wallpapers; 
    for( const i in wallpapers )
    {
        const w = wallpapers[i];

        if ( ! w.initialised )
        {
            //A 720px image is naturally 10in (at 72dpi)
            //If our pattern as 10in across then our image should be 10 units.
            //If our pattern was 10cm across then our image should be 25.4 units and we would expect to need to specify a scale of 1/2.54
            defaultScale = 72.0;
            if ( w.patternurl )
            {
                defaultScale = 1.0;
            }
            else
            {
                switch( pattern.units ) {
                    case "cm":
                        defaultScale = 72.0 / 2.54;
                        break;
                    case "mm":
                        defaultScale = 72.0 / 25.4;
                        break;
                }
            }
            w.scaleX = w.scaleX / defaultScale /*dpi*/; //And adjust by pattern.units
            w.scaleY = w.scaleY / defaultScale /*dpi*/;
            w.hide = ( w.visible !== undefined ) && (! w.visible );
            w.allowEdit = ( w.allowEdit === undefined ) || ( w.allowEdit );
            
            if ( w.imageurl )
            {
                w.displayName = w.filename ? w.filename : w.imageurl;

                $("<img/>") // Make in memory copy of image to avoid css issues
                    .attr("src", w.imageurl )
                    .attr("data-wallpaper", i)
                    .on( "load", function() {
                        //seems like we can't rely on closure to pass w in, it always   points to the final wallpaper
                        const w = wallpapers[ this.dataset.wallpaper ];
                        w.width = this.width;   // Note: $(this).width() will not
                        w.height = this.height; // work for in memory images.
                        //console.log( "jquery Image loaded w.imageurl " + w.imageurl + " width:" + w.width + " height:" + w.height);
                        //console.log( "Wallpaper dimensions known. Image loaded w.imageurl width:" + w.width + " height:" + w.height );
                        if ( w.image )
                        {
                            //console.log( " setting d3Image dimentions." );
                            d3.select( w.image ).attr("width", w.width );        
                            d3.select( w.image ).attr("height", w.height );        
                        }
                    });
            } 
            else if ( w.patternurl )
            {
                w.displayName = w.patternName;

                w.drawPatternWallpaper = function drawPatternWallpaper()
                {
                    const w = this;
                    const drawingOptions = { "outline": false, 
                                             "label": w.showLabels,
                                             "dot": false };

                    if ( w.overrideLineColour )
                        drawingOptions.overrideLineColour = w.overrideLineColour;

                    if ( w.overrideLineStyle )
                        drawingOptions.overrideLineStyle = w.overrideLineStyle;

//rework to create/update groups for drawings                        
                    for( const drawing of w.pattern.drawings )
                    {
                        const drawingGroup = d3.select( w.g ).append("g").attr("class","j-drawing");

                        const drawing0 = drawing; //required for closure
                        drawingGroup.selectAll("g")
                            .data( drawing0.drawingObjects )
                            .enter()
                            .each( function(d,i) {
                                const gd3 = d3.select( this );                        
                                if (   ( typeof d.draw === "function" ) 
                                    && ( ! d.error )
                                    && ( d.isVisible() ) )// editorOptions ) ) )
                                try {
                                    d.draw( gd3, drawingOptions );
                                } catch ( e ) {
                                    d.error = "Drawing failed. " + e;
                                }
                            });
                    }
                }

                const fetchPatternForWallpaper = async () => {
                    const response = await fetch( w.patternurl, {
                      method: 'GET',
                      headers: {
                        'Content-Type': 'application/json'
                      }
                    });
                    const data = await response.json();
                    data.wallpaper = undefined; //don't put wallpapers on wallpapers
                    w.pattern = new Pattern( data );
                    w.width  = w.pattern.visibleBounds.maxX - w.pattern.visibleBounds.minX;
                    w.height = w.pattern.visibleBounds.maxY - w.pattern.visibleBounds.minY;

                    //This however does lead to lines being scaled for thickness too. 
                    const unitScale = function( units ) {
                        switch( units )
                        {
                            case "inch" : return 25.4;
                            case "cm" : return 10;
                            case "mm" :
                            default: return 1;
                        }
                    };                
    
                    const scaleAdjust = unitScale( w.pattern.units ) / unitScale( pattern.units );
                    w.scaleX += scaleAdjust;
                    w.scaleY += scaleAdjust;

                    if ( w.g )
                        w.drawPatternWallpaper(); //otherwise we'll do it when we create w.g
                  }

                fetchPatternForWallpaper();                
            }
                
            if ( updateServer )
                w.updateServer = updateServer;

            w.initialised = true;
        }    
    }
}


//http://bl.ocks.org/humbletim/5507619
function scrollTopTween(scrollTop) 
{
    return function() {
        const i = d3.interpolateNumber(this.scrollTop, scrollTop);

        return function(t) { 
            this.scrollTop = i(t); 
        };
    }
}
  

//Do the drawing... (we've added draw() to each drawing object.
function doDrawings( graphdiv, pattern, editorOptions, contextMenu, controls, focusDrawingObject )
{
    const layoutConfig = editorOptions.layoutConfig;
    const margin = editorOptions.lifeSize ? pattern.getPatternEquivalentOfMM(5) : 0;
    if ( margin )
    {
        pattern.visibleBounds.minX = Math.round( ( pattern.visibleBounds.minX - margin ) * 1000 ) / 1000;
        pattern.visibleBounds.minY = Math.round( ( pattern.visibleBounds.minY - margin ) * 1000 ) / 1000;
        pattern.visibleBounds.maxX = Math.round( ( pattern.visibleBounds.maxX + margin ) * 1000 ) / 1000;
        pattern.visibleBounds.maxY = Math.round( ( pattern.visibleBounds.maxY + margin ) * 1000 ) / 1000;
    }
    const width =  layoutConfig.drawingWidth;
    const height = layoutConfig.drawingHeight;
    let patternWidth = pattern.visibleBounds.maxX - pattern.visibleBounds.minX;
    let patternHeight = pattern.visibleBounds.maxY - pattern.visibleBounds.minY;

    graphdiv.select("svg.pattern-drawing").remove();

    let svg;
    
    if ( editorOptions.lifeSize )
    {
        //The margin needs to at least be 0.5 * strokewidth so tha that strokes arnt clipped. 
        const margin = pattern.getPatternEquivalentOfMM(10); //to allow for rulers
        const rounding = pattern.units === "mm" ? 1 : 10;
        patternWidth = Math.ceil( ( patternWidth + margin ) * rounding ) / rounding;
        patternHeight = Math.ceil( ( patternHeight + margin ) * rounding ) / rounding;
        svg = graphdiv.append("svg")
                      .attr("class", "pattern-drawing " + pattern.units )
                      .attr("viewBox", (pattern.visibleBounds.minX-margin) + " " + (pattern.visibleBounds.minY-margin) + " " + patternWidth + " " + patternHeight )
                      .attr("width", patternWidth + pattern.units )
                      .attr("height", patternHeight + pattern.units )
                      .attr("xmlns:xlink", "http://www.w3.org/1999/xlink" );
    }
    else
    {
        svg = graphdiv.append("svg")
                       .attr("class", "pattern-drawing " + pattern.units )
                       .attr("width", width + ( 2 * margin ) )
                       .attr("height", height + ( 2 * margin ));

        if ( editorOptions.thumbnail )
            svg.attr("viewBox", 0 + " " + 0 + " " + (width + ( 2 * margin )) + " " + (height + ( 2 * margin )) );
    }

    //Arrow head for grainline. 
    const forExport = editorOptions.downloadOption;
    //The id we use for the markers must be unique within the page, but repeatable where we are comparing SVG by hash. 
    editorOptions.arrowId = "arrow" + forExport + editorOptions.fullWindow;
    const markerpath = svg.append("svg:defs")
       .append("marker")
       .attr("class","arrow" ) //must be unique even amongst hidden views in the strand
       .attr("id", editorOptions.arrowId ) 
       .attr("viewBox", "0 -5 12 10")     //0 -5 10 10  //0 0 10 10
       .attr("refX", 8)                  //15 //5
       .attr("refY", 0)                  //-1.5 //5
       .attr("markerWidth", 4)  //6  
       .attr("markerHeight", 4)  //6
       .attr("orient", "auto-start-reverse")
       .append("svg:path") 
       .attr("fill", "none" )
       .attr("stroke-width","2")
       .attr("stroke","black")
       .attr("stroke-linejoin","round")
       .attr("d", "M0,-5L10,0L0,5"); //M0,-5L10,0L0,5 M0,0L10,5L0,10z

//    if ( forExport )
  //      markerpath.attr("stroke", "black").attr("fill","none");  //fill


    const transformGroup1 = svg.append("g"); //This gets used by d3.zoom

    //console.log( "Pattern bounds minX:" + pattern.bounds.minX + " maxX:" + pattern.bounds.maxX );
    //console.log( "Pattern bounds minY:" + pattern.bounds.minY + " maxY:" + pattern.bounds.maxY );

    //transformGroup2 scales from calculated positions in pattern-space (e.g. 10 representing 10cm) to
    //pixels available. So 10cm in a 500px drawing has a scale of 50. 
    let transformGroup2;

    if ( editorOptions.lifeSize )// || ( editorOptions.thumbnail ))
    {
        scale = 1;
        transformGroup2 = transformGroup1; //we don't need another group

        drawRulers( pattern, patternWidth, patternHeight, transformGroup2 );

        if ( editorOptions.targetPiece === "all" )
            drawMeasurementsTable( pattern, transformGroup2 );
    }
    else
    {
        const scaleX = width / patternWidth;                   
        const scaleY = height / patternHeight;           
        
        if ( ( isFinite( scaleX ) ) && ( isFinite( scaleY ) ) )
            scale = scaleX > scaleY ? scaleY : scaleX;
        else if ( isFinite( scaleX ) )
            scale = scaleX;
        else
            scale = 1;

        transformGroup2 = transformGroup1.append("g").attr("transform", "scale(" + scale + "," + scale + ")");
    }

    //console.log( "scale:" + scale + " patternWidth:" + patternWidth + " width:" + width );

    //centralise horizontally                            
    const boundsWidth = pattern.visibleBounds.maxX - pattern.visibleBounds.minX;
    const availableWidth = width / scale;
    const offSetX = ( availableWidth - boundsWidth ) /2;

    //transformGroup3 shifts the position of the pattern, so that it is centered in the available space. 
    const transformGroup3 = transformGroup2.append("g")                               
                                         .attr("class", editorOptions.thumbnail ? "pattern thumbnail" : "pattern");                           

    if ( editorOptions.downloadOption )  
        transformGroup3.attr("id", pattern.patternNumberAndName )
        
    if ( ! editorOptions.lifeSize )
        transformGroup3.attr("transform", "translate(" + ( ( -1.0 * ( pattern.visibleBounds.minX - offSetX ) ) ) + "," + ( ( -1.0 * pattern.visibleBounds.minY ) ) + ")");    

    if ( pattern.wallpapers )
    {
        const wallpaperGroups = transformGroup2.append("g")
                                             .attr("class","wallpapers")
                                             .attr("transform", "translate(" + ( ( -1.0 * ( pattern.visibleBounds.minX - offSetX ) ) ) + "," + ( ( -1.0 * pattern.visibleBounds.minY ) ) + ")")   
                                             .lower();
        doWallpapers( wallpaperGroups, pattern );
    }
     
    //Clicking on an object in the drawing should highlight it in the table.
    const onclick = ! editorOptions.interactive ? undefined : function(d) {
        d3.event.preventDefault();
        focusDrawingObject(d,true);
    };

    for( const drawing of pattern.drawings )
    {
        //TODO depending upon use case, do the pieces or drawing first? 

        //Even if we're not going to drawing pieces lets create the svg placeholders for them so they are ready 
        //if they are clicked in the table. 
        //if ( ! editorOptions.skipPieces )
        //{
            doPieces( drawing, transformGroup3, editorOptions );
        //}

        if ( ! editorOptions.skipDrawing )
        {
            doDrawing( drawing, transformGroup3, editorOptions, onclick, contextMenu );
        }
    }

    const updateServerAfterDelay = function()
    {
        //Lets only update the server if we've stopped panning and zooming for > 1s.
        timeOfLastTweak = (new Date()).getTime();
        if ( ! updateServerTimer )
        {
            const updateServerTimerExpired = function () {

                updateServerTimer = null;          
                //console.log("Zoom update server timer activated. TimeOfLastTweak:" + timeOfLastTweak + " Now:" + (new Date()).getTime());

                if ( (new Date()).getTime() >= ( timeOfLastTweak + 500 ) )
                {
                    const zt = d3.zoomTransform( transformGroup1.node() );
                    if ( editorOptions.updateServer )
                        editorOptions.updateServer( zt.k, zt.x, zt.y );
                }
                else
                    updateServerTimer = setTimeout(updateServerTimerExpired, 500);
            }

            updateServerTimer = setTimeout(updateServerTimerExpired, 500);
        }           
    };

    const zoomed = function() {
        transformGroup1.attr("transform", d3.event.transform);

        const currentScale = d3.zoomTransform( transformGroup1.node() ).k; //do we want to scale 1-10 to 1-5 for fonts and linewidths and dots?
        if (   ( currentScale > (1.1*fontsSizedForScale) )
            || ( currentScale < (0.9*fontsSizedForScale) )
            || ( currentScale === 1 ) || ( currentScale === 8 ) )
        {
            if ( ! fontResizeTimer )
            {
                fontResizeTimer = setTimeout(function () {      
                    fontResizeTimer = null;          
                    fontsSizedForScale = d3.zoomTransform( transformGroup1.node() ).k;
                    //console.log( "Zoomed - fontsSizedForScale " + fontsSizedForScale );

                    for( const drawing of pattern.drawings )
                    {                
                        for( const a of drawing.drawingObjects )
                        {
                            let g = a.drawingSvg;                            
                            if ( g )
                            {
                                const labelPosition = a.labelPosition();

                                if ( labelPosition )
                                {
                                    g.selectAll( "text.labl" )
                                    .attr("font-size", labelPosition.fontSize + "px")
                                    .attr("x", labelPosition.labelX )
                                    .attr("y", labelPosition.labelY );

                                    g.selectAll( "line.labelLine" )
                                    .attr("x2", labelPosition.labelLineX )
                                    .attr("y2", labelPosition.labelLineY );
                                }

                                const fontSize = Math.round( 1300 / scale / fontsSizedForScale )/100; //13 at scale 1
                                g.selectAll( "text.length" )
                                 .attr("font-size", fontSize + "px");

                                 g.selectAll( "text.alongPath" )
                                 .attr("font-size", fontSize + "px");
                       
                                g.selectAll( "circle" )
                                 .attr("r", Math.round(400 / scale / fontsSizedForScale)/100 );

                                const strokeWidth = a.getStrokeWidth( false, (selectedObject===a) );

                                g.selectAll( "line" )
                                    .attr( "stroke-width", strokeWidth );

                                g.selectAll( "path" )
                                    .attr( "stroke-width", strokeWidth );

                                g.selectAll( "ellipse" )
                                    .attr( "stroke-width", strokeWidth );
                            }

                            g = a.outlineSvg;
                            if ( g )
                            {
                                const strokeWidth = a.getStrokeWidth( true );

                                g.selectAll( "line" )
                                 .attr( "stroke-width", strokeWidth );

                                g.selectAll( "path" )
                                 .attr( "stroke-width", strokeWidth );           

                                g.selectAll( "ellipse" )
                                 .attr( "stroke-width", strokeWidth );           

                                g.selectAll( "circle" )
                                    .attr("r", Math.round( 1200 / scale / fontsSizedForScale )/100 );
                            }
                        }        

                        //TODO for each piece also scale their stroke width

                        
                    }
                }, 50);         
            }
        }
        updateServerAfterDelay();         
    };           

    fontsSizedForScale = 1; //the starting scale of transformGroup1.

    if ( editorOptions.allowPanAndZoom )
    {
        //TODO just the fontsize needs setting initially to take editorOptions.scale into account

        const transform = d3.zoomIdentity.translate(editorOptions.translateX, editorOptions.translateY).scale(editorOptions.scale);
        const zoom = d3.zoom()
                    .extent([[0, 0], [width, height]])
                    .scaleExtent([0.5, 32])
                    .on("zoom", zoomed);
        svg.call( zoom)
           .call(zoom.transform, transform);

        fontsSizedForScale = editorOptions.scale;

        if ( controls) 
            controls.select( ".zoom-to-fit" ).on( "click", function() {
                d3.event.preventDefault();

                //Reset transformGroup1 to 0,0 and scale 1
                svg.call(zoom)
                .call(zoom.transform, d3.zoomIdentity);
                
                if ( editorOptions.updateServer )
                {
                    const zt = d3.zoomTransform( transformGroup1.node() );
                    editorOptions.updateServer( zt.k, zt.x, zt.y );
                }
            } );
    }
}

/**
 * Given a piece, drawing object (etc) and a set
 * populate the set with the object, and its 
 * dependencies recursively.
 * @param {*} o 
 * @param {*} visited 
 * @returns 
 */
function captureRecursiveDependencies( o, visited )
{
    visited.add( o );

    if ( typeof o.setDependencies === "undefined" )
        return;
    
    const dependencies = { 
            dependencies: [], 
            add: function ( source, target ) { 

                if (( ! source ) || ( ! target ))
                    return;

                if (   ( target && typeof target.expression === "object" )
                    && ( ! target.isMeasurement )
                    && ( ! target.isVariable ) )  //why?
                {
                    if ( target.expression.addDependencies )
                        target.expression.addDependencies( source, this );
                }
                else if (   ( target instanceof DrawingObject )
                         || ( target.isMeasurement )
                         || ( target.isIncrement ) 
                         || ( target.isVariable ) 
                         )
                    this.dependencies.push( target ); 
            }  
        };    

    o.setDependencies( dependencies );
    for ( const d of dependencies.dependencies )
    {
        if ( ! visited.has( d ) )
            captureRecursiveDependencies( d, visited );
    }
}

function drawMeasurementsTable( pattern, transformGroup2 )
{
    const fontSize = pattern.getPatternEquivalentOfMM(4);
    const margin = fontSize;
    const colour = "#808080";
    const measurementsTable = transformGroup2.append("g");
    measurementsTable.attr("id","measurements");

    const fo = measurementsTable.append( "foreignObject" )
    fo.attr( "x", pattern.visibleBounds.minX + 20 )
      .attr( "y", pattern.visibleBounds.minY + 20 )
      .attr( "width", pattern.getPatternEquivalentOfMM(100) )
      .attr( "height", pattern.getPatternEquivalentOfMM(100) )
      .attr( "font-size", fontSize )
      .attr("color", colour ) //not working

    fo.append( "xhtml:div" )
    .attr("class","measurementsPanel")
    .html( "<table id=\"measurementsTable\"><tbody></tbody></table>" );

    const tbody = $('#measurementsTable > tbody' );

    const escapeHtml = function(unsafe) 
    {
        return unsafe.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
    }

    //We only want to show the measurements and variables that the pieces
    //we're displaying use
    let dependencies;
    try {
        const visited = new Set();
        for( const d of pattern.drawings )
            for( const p of d.pieces )
                captureRecursiveDependencies( p, visited );
        dependencies = visited;
    } catch ( e ) {
        console.log( e ); //We'll revert to showing all 
    }

    for( const mname in pattern.measurement )
    {
        const m = pattern.measurement[mname];
        if (    dependencies 
             && ( ! dependencies.has( m ) ) )
            continue;
        tbody.append( "<tr><td>" + escapeHtml(mname) + "</td><td>" + m.value() + " " +  m.units + "</td></tr>" );
    }

    for( const vname in pattern.variable )
    {
        const v = pattern.variable[vname];

        if  ( dependencies
              && ( ! dependencies.has( v ) ) )
            continue;

        let c = v.constant;
        if ( typeof c === "undefined" )
            continue;
        else if ( typeof c === "string" )
            c = escapeHtml( c );
        tbody.append( "<tr><td>" + escapeHtml(vname) + "</td><td>" + c + "</td></tr>" );
    }

    const tableWidth = $(fo.node()).find( 'div.measurementsPanel > table ').width(); 
    const tableHeight = $(fo.node()).find( 'div.measurementsPanel > table ').height();

    fo.attr( "height", 1 ); //required by firefox otherwise bounding rects returns nonsense
    fo.attr( "height", tableHeight + 2 * margin );
    fo.attr( "width", tableWidth + 2 * margin );

    fo.attr( "x", pattern.visibleBounds.maxX - tableWidth - margin );
    fo.attr( "y", pattern.visibleBounds.maxY - tableHeight - margin );
}


function drawRulers( pattern, patternWidth, patternHeight, transformGroup2 )
{
    const rulers = transformGroup2.append("g");
    rulers.attr("id","rulers");
    const xAxis = rulers.append("g");
    xAxis.attr("class","ruler")
    //add scale marks 
    //units:cm - 1 mark per cm, so patternWidth marks every 10th mark add a label "10cm"
    const strokeWidth = pattern.getPatternEquivalentOfMM(0.5);
    const colour = "#808080";
    const fontSize = pattern.getPatternEquivalentOfMM(5);
    const tickSize = pattern.getPatternEquivalentOfMM(10);
    const step = pattern.units === "mm" ? 5 : 1;
    xAxis.append("line")
        .attr("x1", pattern.visibleBounds.minX )
        .attr("y1", pattern.visibleBounds.minY - tickSize )
        .attr("x2", pattern.visibleBounds.minX + patternWidth )
        .attr("y2", pattern.visibleBounds.minY - tickSize )
        .attr("stroke", colour)
        .attr("stroke-width", strokeWidth );
    for( let i=0; i<patternWidth; i+=step )
    {
        xAxis.append("line")
                .attr("x1", i + pattern.visibleBounds.minX )
                .attr("y1", pattern.visibleBounds.minY - tickSize )
                .attr("x2", i + pattern.visibleBounds.minX )
                .attr("y2", pattern.visibleBounds.minY - tickSize + tickSize * ( i % (10*step) == 0 ? 1 : i % (5*step) == 0 ? 0.75 : 0.5 ))
                .attr("stroke", colour)
                .attr("stroke-width", strokeWidth );
        if ( i % (10*step) === 0 )
        {
            xAxis.append("text")
                        .attr("class","labl")
                        .attr("x", i + pattern.visibleBounds.minX + 0.25 * tickSize )
                        .attr("y", pattern.visibleBounds.minY )
                        .attr("font-size", fontSize )
                        .attr("fill", colour)
                        .text( i + ( i == 10*step ? " " + pattern.units : "" ) );
        }
    }  
    const yAxis = rulers.append("g");
    yAxis.attr("class","ruler")
    //add scale marks 
    //units:cm - 1 mark per cm, so patternWidth marks every 10th mark add a label "10cm"
    yAxis.append("line")
        .attr("x1", pattern.visibleBounds.minX - tickSize )
        .attr("y1", pattern.visibleBounds.minY )
        .attr("x2", pattern.visibleBounds.minX - tickSize )
        .attr("y2", pattern.visibleBounds.minY + patternHeight )
        .attr("stroke",colour)
        .attr("stroke-width", strokeWidth );
    for( let i=0; i<patternHeight; i+=step )
    {
        yAxis.append("line")
                .attr("x1", pattern.visibleBounds.minX - tickSize )
                .attr("y1", i + pattern.visibleBounds.minY )
                .attr("x2", pattern.visibleBounds.minX - tickSize + tickSize * ( i % (10*step) == 0 ? 1 : i % (5*step) == 0 ? 0.75 : 0.5 ) )
                .attr("y2", i + pattern.visibleBounds.minY )
                .attr("stroke",colour)
                .attr("stroke-width", strokeWidth );
        if ( ( i % (10*step) === 0 ) && ( i !== 0 ) )
            {
                xAxis.append("text")
                            .attr("class","labl")
                            .attr("x", pattern.visibleBounds.minX - 0.25 * tickSize )
                            .attr("y", i + pattern.visibleBounds.minY - 0.25 * tickSize )
                            .attr("font-size", fontSize )
                            .attr("fill", colour)
                            .text( i + ( i == 10*step ? " " + pattern.units : "" ) );
            }                
    }      
}


function doDrawing( drawing, transformGroup3, editorOptions, onclick, contextMenu ) 
{
    const outlineGroup = ! editorOptions.interactive ? undefined : transformGroup3.append("g").attr("class","j-outline");
    const drawingGroup = transformGroup3.append("g").attr("class","j-drawing");

    const drawObject = function( d, g, drawingOptions ) {
        const gd3 = d3.select( g );                        
        if (   ( typeof d.draw === "function" ) 
            && ( ! d.error )            
            && (    d.isVisible( editorOptions ) 
                 || editorOptions.interactive ) ) //For interactive, we'll draw items from hidden groups, so that we can show them if the user clicks on them in the table.
        try {
            d.draw( gd3, drawingOptions );
            d.drawingSvg = gd3; //not necessary if this is thumbnail

            if ( ! d.isVisible( editorOptions ) )
                d.drawingSvg.attr( "class", "group-hidden" );

        } catch ( e ) {
            d.error = "Drawing failed. " + e;
        }
    };

    if ( editorOptions.interactive )
    {
        const drawingOptions = { "outline": false, 
                                    "label": (! editorOptions.hideLabels),
                                    "dot":  (! editorOptions.hideLabels) };
        drawingGroup.selectAll("g")
        .data( drawing.drawingObjects )
        .enter()
        .append("g")
        .on("contextmenu", contextMenu)
        .on("click", onclick)
        .on('touchstart', function() { 
            this.touchStartTime = new Date(); 
            if ( event ) event.preventDefault();
        })
        .on('touchend',function(d) {    
            const endTime = new Date(); 
            const duration = endTime - this.touchStartTime;

            if ( event ) 
                event.preventDefault();

            if (( duration > 400) || ( selectedObject === d ))
            { 
                //console.log("long touch, " + (duration) + " milliseconds long");
                contextMenu(d);
            }
            else {
                //console.log("regular touch, " + (duration) + " milliseconds long");
                onclick(d);
            }                    
        })
        .each( function(d,i) {
            drawObject( d, this, drawingOptions );
        });
    }
    else //thumbnail
    {
        //In order to have the minimum SVG then don't create a group for each drawing object. 
        const drawingOptions = { "outline": false, 
                                    "label": (! editorOptions.hideLabels),
                                    "dot":  (! editorOptions.hideLabels) };
        drawingGroup.selectAll("g")
            .data( drawing.drawingObjects )
            .enter()
            .each( function(d,i) {
                drawObject( d, this, drawingOptions );
            });
    }

    if ( outlineGroup )
    {
        outlineGroup.selectAll("g") 
            .data( drawing.drawingObjects )
            .enter()
            .append("g")
            .on("contextmenu", contextMenu)
            .on("click", onclick)
            .on('touchstart', function() { 
                this.touchStartTime = new Date(); 
                if ( event ) event.preventDefault();
            })
            .on('touchend',function(d) {    
                const endTime = new Date(); 
                const duration = endTime - this.touchStartTime;
                if ( event ) event.preventDefault();
                if (( duration > 400) || ( selectedObject === d ))
                { 
                    //console.log("long touch, " + (duration) + " milliseconds long");
                    contextMenu(d);
                }
                else {
                    //console.log("regular touch, " + (duration) + " milliseconds long");
                    onclick(d);
                }                    
            })                
            .each( function(d,i) {
                const g = d3.select( this );
                if (   ( typeof d.draw === "function" ) 
                    && ( ! d.error ) )
                {
                    d.draw( g, { "outline": true, "label": false, "dot":true } );
                    d.outlineSvg = g;

                    if ( ! d.isVisible( editorOptions ) )
                        d.outlineSvg.attr( "class", "group-hidden" );
                }
            });
    }
}


function doPieces( drawing, transformGroup3, editorOptions )
{
    let piecesToDraw = drawing.pieces;

    //Skip non-default pieces when making thumbnail
    if ( editorOptions.thumbnail )
    {
        piecesToDraw = [];
        for( const p of drawing.pieces )
        {
            if ( p.data.inLayout )
                piecesToDraw.push( p );
        }
        if ( piecesToDraw.length === 0)
            piecesToDraw = drawing.pieces; //revert back to all pieces
    }

    const pieceGroup = transformGroup3.append("g").attr("class","j-pieces");
    pieceGroup.selectAll("g")
                .data( piecesToDraw )
                .enter()
                .append("g")        
    //.on("contextmenu", contextMenu)
    //.on("click", onclick)
                .each( function(p,i) {
                    const g = d3.select( this );
                    g.attr("id", p.name );

                    //if doing an export of multiple pieces then take the piece.mx/my into account
                    if ( editorOptions.targetPiece === "all" ) //OR AN ARRAY WITH >1 length
                    {
                        g.attr("transform", "translate(" + ( 1.0 * p.data.mx ) + "," +  (1.0 * p.data.my ) + ")");    
                    }

                    p.svg = g;

                    if ( ! editorOptions.skipPieces )
                    {
                        if ( typeof p.drawSeamLine === "function" )
                        {                            
                            p.drawPiece( editorOptions );
                        }
                    }
            });
}


function doWallpapers( wallpaperGroups, pattern )
{
    const visibleWallpapers = [];
    for( const w of pattern.wallpapers )
    {
        if ( ! w.hide )
            visibleWallpapers.push( w );
    }

    const drag = d3.drag()
        .on("start", function(wallpaper) {
            wallpaper.offsetXdragStart = wallpaper.offsetX - d3.event.x;
            wallpaper.offsetYdragStart = wallpaper.offsetY - d3.event.y;
        })
        .on("drag", function(wallpaper) {
            const wallpaperG = d3.select(this);        
            wallpaper.offsetX = wallpaper.offsetXdragStart + d3.event.x;
            wallpaper.offsetY = wallpaper.offsetYdragStart + d3.event.y;
            wallpaperG.attr("transform", "translate(" + wallpaper.offsetX + "," + wallpaper.offsetY + ") " + " scale(" + wallpaper.scaleX + "," + wallpaper.scaleY + " )" );
        })
        .on("end", function(wallpaper){
            wallpaper.updateServer( d3.event );
        });

    const data = wallpaperGroups.selectAll("g.wallpaper")
                    .data( visibleWallpapers, function(d){ return d.patternurl || d.imageurl } //required to correctly match wallpapers to objects
                    );

    data.enter()
        .append("g")
        .attr( "class", function(w){ return w.editable ? "wallpaper editable" : "wallpaper" } )
        .attr( "transform", function(wallpaper) { return  "translate(" + ( wallpaper.offsetX ) + "," + ( wallpaper.offsetY ) + ")"
                                                        + " scale(" + wallpaper.scaleX + "," + wallpaper.scaleY + ")" } )
        .each( function(w){
            //Set this up so that we can later use dimensionsKnown()

            if ( w.imageurl )
            {
                //if we know the dimensions already, set them! (Safari needs this on showing a hidden wallpaper)
                const imaged3 = d3.select(this).append("image")
                                        .attr( "href", w.imageurl )
                                        .attr( "opacity", w.opacity )
                                        .attr( "width", w.width)
                                        .attr( "height", w.height);
                imaged3.each( function(i) {
                    w.image = this;
                });
            }
            else if ( w.patternurl ) 
            {
                w.g = this;
                d3.select(this).attr("opacity", w.opacity );
                if ( w.pattern ) //pattern loaded already, including when toggling full screen
                    w.drawPatternWallpaper();
            }
        } );

    data.exit()
        .remove();

    const resize = d3.drag()
                    .on("start", function(wallpaper) {
                        wallpaper.offsetXdragStart = d3.event.x - wallpaper.width;
                        wallpaper.offsetYdragStart = d3.event.y - wallpaper.height;
                        //console.log("start offsetXdragStart:" + wallpaper.offsetXdragStart );
                    })
                    .on("end", function(wallpaper) {
                        const wallpaperG = d3.select(this.parentNode);
                        const circle = d3.select(this);
                        const rect = wallpaperG.select("rect");
                        const ratio = circle.attr("cx") / wallpaper.width;     
                        //const scaleXbefore = wallpaper.scaleX;                   
                        wallpaper.scaleX = wallpaper.scaleX * ratio; //fixed aspect?
                        wallpaper.scaleY = wallpaper.scaleY * ratio;
                        //console.log( "cx:" + circle.attr("cx") + " image:" + wallpaper.width + "  ratio:" + ratio + "  scaleXbefore:" + scaleXbefore + "  scaleXNow:" + wallpaper.scaleX );
                        wallpaperG.attr("transform", "translate(" + wallpaper.offsetX + "," + wallpaper.offsetY + ") " + " scale(" + wallpaper.scaleX + "," + wallpaper.scaleY + " )" );
                        circle.attr("cx", wallpaper.width )
                              .attr("cy", wallpaper.height );
                        rect.attr("width", wallpaper.width )
                            .attr("height", wallpaper.height );
                        wallpaper.updateServer( d3.event );
                    } )
                    .on("drag", function(wallpaper) {
                        const wallpaperG = d3.select(this.parentNode);
                        const circle = d3.select(this);
                        const rect = wallpaperG.select("rect");
                        let newX = d3.event.x - wallpaper.offsetXdragStart;
                        let newY = d3.event.y - wallpaper.offsetYdragStart;
                        //console.log("drag d3.event.x:" + d3.event.x + "  newX:" + newX );

                        //fixed aspect
                        const ratioX = newX / wallpaper.width;
                        const ratioY = newY / wallpaper.height;
                        const ratio = (ratioX+ratioY)/2.0;
                        newX = ratio * wallpaper.width;
                        newY = ratio * wallpaper.height;

                        circle.attr("cx", newX )
                              .attr("cy", newY );
                        rect.attr("width", newX )
                            .attr("height", newY );
                    });

    //Add a resizing boundary to each editable wallpaper.                 
    wallpaperGroups.selectAll("g")
                    .data( visibleWallpapers ,function(d){return d.patternurl || d.imageurl} )
                    .each( function(w,i) {
                        const g = d3.select(this);
                        //This worked on Firefox and Chrome, but not Safari.
                        //var box = g.node().getBBox();
                        //w.width = box.width;
                        //w.height = box.height;

                        if ( w.editable )
                        {
                            g.append("rect")
                            .attr("x",0)
                            .attr("y",0)
                            .attr("stroke", "red")
                            .attr("fill", "none")
                            .attr("width", w.width)
                            .attr("height", w.height);
    
                            if ( ! w.patternurl ) //don't allow re-sizing of patterns, just images
                                g.append( "circle") 
                                .attr("cx", function(w) { return w.width } )
                                .attr("cy", function(w) { return w.height } )
                                .attr("r", 10 / scale / w.scaleX / fontsSizedForScale )
                                .attr("fill", "red")
                                .call(resize);
                                
                            g.call(drag);
                        }
                        else
                        {
                            g.select("rect").remove();
                            g.select("circle").remove();
                            g.on(".drag", null );
                        }
                    } );
}


function doTable( graphdiv, pattern, editorOptions, contextMenu, focusDrawingObject )
{
    const layoutConfig = editorOptions.layoutConfig;
    const margin = layoutConfig.tableMargin;//25; 
    const width =  layoutConfig.tableWidth;//400;
    const height = layoutConfig.tableHeight;//600;
    const minItemHeight = 30; //should not be required
    const itemMargin = 8;
    const itemWidth = width *3/4;
    let ypos = 0;
    const asFormula = editorOptions.showFormulas; 

    const onclick = function(d) {
        d3.event.preventDefault();
        focusDrawingObject(d,false);
    }

    graphdiv.select("div.pattern-table").remove();

    let combinedObjects = [];

    //TODO quick jump to start of pattern, variatble, pieces
    if ( pattern.measurement )
    {
        for( const m in pattern.measurement )
            combinedObjects.push( pattern.measurement[m] );
    }

    if ( pattern.variable )
    {
        for( const i in pattern.variable )
            combinedObjects.push( pattern.variable[i] );
    }

    for( const drawing of pattern.drawings )
    {
        combinedObjects = combinedObjects.concat( drawing.drawingObjects );
        combinedObjects = combinedObjects.concat( drawing.pieces );
    }

    const sanitiseForHTML = function ( s ) {

            if ( typeof s !== "string" )
                s = "" + s;
                    
            return s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
        };

    const svg = graphdiv.append("div")
                        .attr("class", "pattern-table")
                        .style( "height", height +"px" )    
                        .append("svg")
                        .attr("width", width + ( 2 * margin ) )
                        .attr("height", minItemHeight * combinedObjects.length );    

    svg.selectAll("g")
       .data( combinedObjects )
       .enter()        
       .append("g")
       .each( function(d,i) {

        const divHeight = function(that) {

            //this - the dom svg element
            //that - the data object

            const h = $(this).find( "div.outer" ).height();
            
            if ( h < minItemHeight )
                return minItemHeight;

            return h;
        };

        const g = d3.select( this );

        let classes = "j-item";

        if ( d.isMeasurement )
            classes += " j-measurement";
        else if ( d.isVariable )
            classes += " j-variable";
        else if ( d instanceof DrawingObject )
        {   
            if ( ! d.isVisible( editorOptions ) ) //is a drawing object
                classes += " group-hidden"; //hidden because of groups
        }
        else if ( d instanceof Piece )
            classes += " j-piece";

        d.tableSvg = g;
        d.tableSvgX = itemWidth;
        d.tableSvgY = ypos + ( 0.5 * minItemHeight );

        const fo = g.append( "foreignObject" )
                    .attr( "x", 0 )
                    .attr( "y", function (d) { 
                                return ypos;
                              } )
                    .attr( "width", itemWidth  );

        let html;
        try {
            html = d.html( asFormula );
            if ( d.data?.comments )
                html = '<div class="comments">' + sanitiseForHTML( d.data.comments ) + '</div>' + html;
            if (d.error)
                html += '<div class="error">' + sanitiseForHTML( d.error ) + '</div>' ;
        } catch ( e ) {

            if ( ! d.error )
                d.error = "Failed to generate description.";

            html = '<div class="error">' + sanitiseForHTML( d.error ) + '</div>';
        }

        if ( d.error )
            classes += " error";

        g.attr( "class", classes ) ;    

        fo.append( "xhtml:div" )
           .attr("class","outer")
           .append( "xhtml:div" )
           .attr("class","desc")
           .html( html );

        fo.attr( "height", 1 ); //required by firefox otherwise bounding rects returns nonsense
        fo.attr( "height", divHeight );

        g.attr( "height", divHeight )
         .attr( "y", function (d) { //Get the height of the foreignObject.
                                    const h = this.childNodes[0].getBoundingClientRect().height;
                                    ypos += h + itemMargin; 
                                    //console.log("y: " + ypos );
                                    return ypos } )

        g.on("contextmenu", contextMenu)
         .on("click", onclick )
         .on('touchstart', function() { 
            this.touchStartTime = new Date(); 
            if ( event ) event.preventDefault();
         })
         .on('touchend',function(d) {    
            const endTime = new Date(); 
            const duration = endTime - this.touchStartTime;
            if ( event ) event.preventDefault();
            if (( duration > 400) || ( selectedObject === d ))
            { 
                //console.log("long touch, " + (duration) + " milliseconds long");
                contextMenu(d);
            }
            else {
                //console.log("regular touch, " + (duration) + " milliseconds long");
                onclick(d);
            }                    
         });
    }); //.each
        
    svg.attr("height", ypos );    

    linksGroup = svg.append("g")
                    .attr("class", "links");

    //Links area is width/4 by ypos.            
    const linkScale = (width/4) / Math.log( Math.abs( ypos /30 ) );   

    drawLinks( pattern, linkScale );
}


function drawLinks( pattern, linkScale ) {
    const linkData = pattern.dependencies.dependencies;
    
    linksGroup.selectAll("path.link") //rename .link to .dependency
                    .data(linkData)
                    .enter().append("path")
                    .attr("class", "link" )
                    .attr("d", function( link ) {
                        const x0 = link.source.tableSvgX, y0 = link.source.tableSvgY,
                              x1 = link.target.tableSvgX, y1 = link.target.tableSvgY;
                    
                        const dy = y0 - y1,
                              l = Math.log( Math.abs(dy /30 ) ) * linkScale;
                    
                        const path = d3.path();
                        path.moveTo( x0, y0 );
                        path.bezierCurveTo( x0+l , y0, x1+l, y1, x1, y1 );
                        return path;                      
                    } );
}


/*
 * Curve that connects items in the table.
 */
function curve(link) {
    const x0 = link.source.tableSvgX, y0 = link.source.tableSvgY,
          x1 = link.target.tableSvgX, y1 = link.target.tableSvgY;

    const dy = y0 - y1,
          l = Math.log( Math.abs(dy /30 ) ) * 50;

    const path = d3.path();
    path.moveTo( x0, y0 );
    path.bezierCurveTo( x0+l , y0, x1+l, y1, x1, y1 );
    return path;                      
}


//TODO move to kinodbglue
function newkvpSet(noRefresh)
{
    const kvp = { } ;
    kvp.kvps = new Array() ;

    kvp.add = function (k, v)
    {
        this.kvps.push ( {k: k, v: v} ) ;
    } ;

    kvp.toString = function (p)
    {
        let r = '' ;

        for ( const kvp of this.kvps )
            r += '&' + p + kvp.k + '=' + encodeURIComponent( kvp.v );

        return r ;
    } ;

    if (noRefresh)
        kvp.add("_noRefresh", -1) ;

    return kvp ;
}

//TODO move to kinodbglue
function fakeEvent(location, x, y)
{
    let pXY = {x: 0, y: 0} ;
    
    if (location !== undefined)
    {
        pXY = getElementXY(location) ;
        pXY.x = Math.round(pXY.x + x) ;
        pXY.y = Math.round(pXY.y + y) ;
    }
    else
    {
        pXY.x = Math.round(x) ;
        pXY.y = Math.round(y) ;
    }
    
    // event to satisfy goGraph's requirements
    return { target: location, pageX: 0, pageY: 0, processedXY: pXY } ;
}


export{ PatternDrawing, doDrawings, doTable, drawPattern  };
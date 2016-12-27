c.log.debug('Scanning visible area...');
c.scrollToCurrent();
c.buffer.top = parseInt(
    document.body.scrollTop * c.zoomLevel - c.screen.y1 * c.zoomLevel, 10
);
c.buffer.left = parseInt(
    document.body.scrollLeft * c.zoomLevel - c.screen.x1 * c.zoomLevel, 10
);
c.buffer.finish = !c.isMorePage();
if (c.buffer.finish) {
    c.buffer.width = parseInt((c.screen.x2 - c.screen.x1), 10) * c.zoomLevel;
    c.buffer.height = parseInt((c.screen.y2 - c.screen.y1), 10) * c.zoomLevel;
    c.buffer.finish = true;
}
c.buffer;

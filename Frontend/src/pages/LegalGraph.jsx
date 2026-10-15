import React, { useState, useEffect, useRef, useCallback } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import SpriteText from 'three-spritetext';
import * as THREE from 'three';
import graphDataRaw from '../graph.json';

const CHUNK_SIZE = 30;
const MAX_NODES = 250;

const LegalGraph = () => {
    const fgRef = useRef();
    const [graphData, setGraphData] = useState({ nodes: [], links: [] });
    const [fullData, setFullData] = useState(null);
    const [status, setStatus] = useState("INITIALIZING SYSTEM...");
    const [selectedNode, setSelectedNode] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [showWelcome, setShowWelcome] = useState(true);

    // Helper: Generate Smart Label
    const getSmartLabel = (node) => {
        if (node.data.type === 'statute') {
            if (node.data.section_number) {
                // e.g., "IPC Section" + " 37" -> "IPC Section 37"
                // Check if label already ends with "Section" to avoid "IPC Section Section 37"
                const base = node.data.label || "Section";
                return `${base} ${node.data.section_number}`;
            }
            return node.data.label || "Statute";
        } else if (node.data.type === 'case') {
            // Try to extract case name from text if label is generic like "High Court (2021)"
            // Assuming text starts with Case Name
            if (node.data.text) {
                const firstLine = node.data.text.split('\n')[0];
                if (firstLine.length < 50) return firstLine;
                return firstLine.substring(0, 47) + "...";
            }
            return node.data.label || "Case Law";
        }
        return node.data.label || node.data.id;
    };

    // 1. Parse Data & Select Nodes (Multi-Component BFS)
    useEffect(() => {
        const rawNodes = graphDataRaw.elements.nodes;
        const rawLinks = graphDataRaw.elements.edges;

        // Build Adjacency Map & Calculate Degrees
        const adjacency = new Map();
        const degrees = new Map();

        rawNodes.forEach(n => {
            adjacency.set(n.data.id, []);
            degrees.set(n.data.id, 0);
        });

        rawLinks.forEach(link => {
            const src = link.data.source;
            const tgt = link.data.target;
            if (adjacency.has(src)) {
                adjacency.get(src).push(tgt);
                degrees.set(src, degrees.get(src) + 1);
            }
            if (adjacency.has(tgt)) {
                adjacency.get(tgt).push(src);
                degrees.set(tgt, degrees.get(tgt) + 1);
            }
        });

        // Multi-Component BFS Strategy
        const selectedNodeIds = new Set();
        const visited = new Set();

        // Sort all nodes by degree (descending) to use as seeds
        const sortedNodeIds = [...rawNodes]
            .sort((a, b) => degrees.get(b.data.id) - degrees.get(a.data.id))
            .map(n => n.data.id);

        let seedIndex = 0;

        while (selectedNodeIds.size < MAX_NODES && seedIndex < sortedNodeIds.length) {
            const startNodeId = sortedNodeIds[seedIndex];
            seedIndex++;

            if (visited.has(startNodeId)) continue;

            // Start BFS from this seed
            const queue = [startNodeId];

            while (queue.length > 0 && selectedNodeIds.size < MAX_NODES) {
                const currentId = queue.shift();
                if (visited.has(currentId)) continue;

                visited.add(currentId);
                selectedNodeIds.add(currentId);

                const neighbors = adjacency.get(currentId) || [];
                // Sort neighbors by degree to prioritize hubs
                neighbors.sort((a, b) => degrees.get(b) - degrees.get(a));

                for (const neighborId of neighbors) {
                    if (!visited.has(neighborId)) {
                        queue.push(neighborId);
                    }
                }
            }
        }

        // Filter Nodes & Links
        const nodes = rawNodes
            .filter(n => selectedNodeIds.has(n.data.id))
            .map(n => ({
                id: n.data.id,
                label: getSmartLabel(n),
                text: n.data.full_text || n.data.text,
                type: n.data.type || 'unknown',
                val: n.data.type === 'statute' ? 30 : 10,
                // Keep original data for search fallback
                originalData: n.data
            }));

        const links = rawLinks
            .filter(l => selectedNodeIds.has(l.data.source) && selectedNodeIds.has(l.data.target))
            .map(e => ({
                source: e.data.source,
                target: e.data.target
            }));

        setFullData({ nodes, links });
    }, []);

    // 2. Chunk Loading Logic
    useEffect(() => {
        if (!fullData) return;

        let index = 0;
        const interval = setInterval(() => {
            if (index >= fullData.nodes.length) {
                clearInterval(interval);
                setStatus(`SYSTEM ACTIVE: ${fullData.nodes.length} NODES ONLINE`);
                return;
            }

            setGraphData(prev => {
                const nextChunk = fullData.nodes.slice(index, index + CHUNK_SIZE);
                const existingIds = new Set(prev.nodes.map(n => n.id));
                const uniqueNextChunk = nextChunk.filter(n => !existingIds.has(n.id));

                const newNodes = [...prev.nodes, ...uniqueNextChunk];
                const nodeIds = new Set(newNodes.map(n => n.id));

                const relevantLinks = fullData.links.filter(l => {
                    const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
                    const targetId = typeof l.target === 'object' ? l.target.id : l.target;
                    return nodeIds.has(sourceId) && nodeIds.has(targetId);
                });

                setStatus(`LOADING DATA CHUNK... (${newNodes.length})`);
                return { nodes: newNodes, links: relevantLinks };
            });

            index += CHUNK_SIZE;
        }, 500);

        return () => clearInterval(interval);
    }, [fullData]);

    // 3. Physics Configuration
    useEffect(() => {
        if (fgRef.current) {
            fgRef.current.d3Force('link').distance(60).strength(0.8);
            fgRef.current.d3Force('charge').strength(-150);
            fgRef.current.d3Force('center').strength(0.6);
        }
    }, [graphData]);

    const handleNodeClick = useCallback(node => {
        const distance = 120;
        const distRatio = 1 + distance / Math.hypot(node.x, node.y, node.z);
        if (fgRef.current) {
            fgRef.current.cameraPosition(
                { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio },
                node,
                2000
            );
        }
        setSelectedNode(node);
    }, []);

    // Global Search Logic
    const handleSearch = (e) => {
        const query = e.target.value;
        setSearchQuery(query);

        if (query.length > 2) {
            // 1. Search in visible nodes first
            let match = graphData.nodes.find(n =>
                n.label.toLowerCase().includes(query.toLowerCase()) ||
                (n.text && n.text.toLowerCase().includes(query.toLowerCase()))
            );

            // 2. If not found, search in RAW data
            if (!match) {
                const rawMatch = graphDataRaw.elements.nodes.find(n => {
                    const label = getSmartLabel(n);
                    const text = n.data.full_text || n.data.text || "";
                    return label.toLowerCase().includes(query.toLowerCase()) ||
                        text.toLowerCase().includes(query.toLowerCase());
                });

                if (rawMatch) {
                    // Add this node to the graph dynamically
                    const newNode = {
                        id: rawMatch.data.id,
                        label: getSmartLabel(rawMatch),
                        text: rawMatch.data.full_text || rawMatch.data.text,
                        type: rawMatch.data.type || 'unknown',
                        val: rawMatch.data.type === 'statute' ? 30 : 10,
                        x: 0, y: 0, z: 0 // Will be positioned by force engine
                    };

                    // Find neighbors to add context
                    const neighbors = [];
                    const newLinks = [];

                    graphDataRaw.elements.edges.forEach(l => {
                        if (l.data.source === newNode.id || l.data.target === newNode.id) {
                            const neighborId = l.data.source === newNode.id ? l.data.target : l.data.source;
                            const neighborRaw = graphDataRaw.elements.nodes.find(n => n.data.id === neighborId);
                            if (neighborRaw) {
                                neighbors.push({
                                    id: neighborRaw.data.id,
                                    label: getSmartLabel(neighborRaw),
                                    text: neighborRaw.data.full_text || neighborRaw.data.text,
                                    type: neighborRaw.data.type || 'unknown',
                                    val: neighborRaw.data.type === 'statute' ? 30 : 10,
                                });
                                newLinks.push({ source: l.data.source, target: l.data.target });
                            }
                        }
                    });

                    // Update State
                    setGraphData(prev => {
                        const existingIds = new Set(prev.nodes.map(n => n.id));
                        const nodesToAdd = [newNode, ...neighbors].filter(n => !existingIds.has(n.id));

                        if (nodesToAdd.length === 0) return prev; // Already exists

                        setStatus(`FOUND & ADDED ${nodesToAdd.length} NODES`);

                        // We need to wait for state update to fly to node, but we can set match here
                        match = newNode;

                        return {
                            nodes: [...prev.nodes, ...nodesToAdd],
                            links: [...prev.links, ...newLinks]
                        };
                    });
                }
            }

            if (match) {
                // If it's a new node, it might not have coordinates yet. 
                // We set a timeout to let the force engine tick once.
                setTimeout(() => handleNodeClick(match), 100);
            }
        }
    };

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%', background: '#000011', overflow: 'hidden', fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif" }}>

            {/* Welcome Modal */}
            {showWelcome && (
                <div style={{
                    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                    background: 'rgba(0,0,0,0.8)', zIndex: 2000, display: 'flex',
                    justifyContent: 'center', alignItems: 'center'
                }}>
                    <div style={{
                        background: '#1a232e', padding: '40px', borderRadius: '12px',
                        maxWidth: '600px', border: '1px solid #4682B4', boxShadow: '0 0 30px rgba(70, 130, 180, 0.5)',
                        color: '#e0f0ff', textAlign: 'center'
                    }}>
                        <h1 style={{ color: '#d4af37', fontFamily: "'Times New Roman', serif", marginTop: 0 }}>Welcome to Legal Nexus</h1>
                        <p style={{ fontSize: '1.1rem', lineHeight: '1.6', color: '#b0c4de' }}>
                            Explore the intricate web of Indian Laws and Cases.
                        </p>
                        <div style={{ textAlign: 'left', margin: '30px 0', padding: '0 20px' }}>
                            <div style={{ marginBottom: '15px' }}>🖱️ <strong>Drag</strong> to rotate the view</div>
                            <div style={{ marginBottom: '15px' }}>📜 <strong>Scroll</strong> to zoom in/out</div>
                            <div style={{ marginBottom: '15px' }}>👆 <strong>Click</strong> a node to view details</div>
                            <div style={{ marginBottom: '15px' }}>🔍 <strong>Search</strong> to find any law or case</div>
                        </div>
                        <button
                            onClick={() => setShowWelcome(false)}
                            style={{
                                background: '#4682B4', color: 'white', border: 'none', padding: '12px 30px',
                                fontSize: '1rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold',
                                transition: 'background 0.2s'
                            }}
                            onMouseOver={e => e.target.style.background = '#3a6ea5'}
                            onMouseOut={e => e.target.style.background = '#4682B4'}
                        >
                            Enter Visualization
                        </button>
                    </div>
                </div>
            )}

            {/* Legend */}
            <div style={{
                position: 'absolute', bottom: 30, left: 30, zIndex: 100,
                background: 'rgba(0, 10, 20, 0.8)', padding: '15px', borderRadius: '8px',
                border: '1px solid #334455', color: '#e0f0ff'
            }}>
                <h3 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#8899aa', textTransform: 'uppercase' }}>Legend</h3>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#d4af37', marginRight: '10px' }}></div>
                    <span style={{ fontSize: '0.9rem' }}>Statute / Act</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#4682B4', marginRight: '10px' }}></div>
                    <span style={{ fontSize: '0.9rem' }}>Case Law</span>
                </div>
            </div>

            {/* Search Bar */}
            <div style={{
                position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)',
                zIndex: 1000, width: '400px'
            }}>
                <input
                    type="text"
                    placeholder="Search for laws, sections, or cases..."
                    value={searchQuery}
                    onChange={handleSearch}
                    style={{
                        width: '100%', padding: '12px 20px', background: 'rgba(10, 15, 25, 0.9)',
                        border: '1px solid #4682B4', color: '#e0f0ff', borderRadius: '25px',
                        outline: 'none', fontFamily: 'inherit', fontSize: '1rem',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
                    }}
                />
            </div>

            {/* Status */}
            <div style={{ position: 'absolute', top: 20, left: 20, color: '#4682B4', zIndex: 100, pointerEvents: 'none', fontWeight: 'bold', fontSize: '0.8rem', letterSpacing: '1px' }}>
                {status}
            </div>

            {/* Info Panel */}
            <div style={{
                position: 'absolute', top: 0, right: 0, bottom: 0, width: '400px',
                background: 'rgba(10, 15, 22, 0.95)', borderLeft: '1px solid #334455',
                transform: selectedNode ? 'translateX(0)' : 'translateX(100%)',
                transition: 'transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)',
                padding: '30px', overflowY: 'auto', zIndex: 900, backdropFilter: 'blur(10px)',
                boxShadow: '-5px 0 20px rgba(0,0,0,0.5)'
            }}>
                {selectedNode && (
                    <>
                        <button
                            onClick={() => setSelectedNode(null)}
                            style={{
                                position: 'absolute', top: 15, right: 15, background: 'transparent',
                                border: 'none', color: '#667788', fontSize: '1.5rem', cursor: 'pointer'
                            }}
                        >
                            &times;
                        </button>
                        <div style={{
                            display: 'inline-block', background: selectedNode.type === 'statute' ? 'rgba(212, 175, 55, 0.2)' : 'rgba(70, 130, 180, 0.2)',
                            padding: '6px 12px', borderRadius: '4px',
                            fontSize: '0.75rem', border: `1px solid ${selectedNode.type === 'statute' ? '#d4af37' : '#4682B4'}`,
                            marginBottom: '20px', color: selectedNode.type === 'statute' ? '#d4af37' : '#4682B4',
                            fontWeight: 'bold', letterSpacing: '1px', textTransform: 'uppercase'
                        }}>
                            {selectedNode.type}
                        </div>

                        <h2 style={{
                            marginTop: 0, color: '#e0f0ff', borderBottom: '1px solid #334455',
                            paddingBottom: '20px', fontSize: '1.6rem', fontFamily: "'Times New Roman', serif",
                            lineHeight: '1.3'
                        }}>
                            {selectedNode.label}
                        </h2>

                        <div style={{
                            fontSize: '1rem', lineHeight: 1.7, color: '#b0c4de',
                            whiteSpace: 'pre-wrap', marginTop: '20px', fontFamily: "'Georgia', serif"
                        }}>
                            {selectedNode.text ? selectedNode.text.substring(0, 2000) : "No text content available."}
                        </div>
                    </>
                )}
            </div>

            <ForceGraph3D
                ref={fgRef}
                graphData={graphData}
                backgroundColor="#000011"

                nodeThreeObjectExtend={true}
                nodeThreeObject={node => {
                    const sprite = new SpriteText(node.label);
                    sprite.color = node.type === 'statute' ? '#d4af37' : '#4682B4';
                    sprite.textHeight = node.type === 'statute' ? 8 : 5;
                    sprite.backgroundColor = 'rgba(0,0,0,0.6)';
                    sprite.padding = 3;
                    sprite.borderRadius = 4;
                    sprite.center.y = -0.6;
                    return sprite;
                }}

                nodeColor={node => {
                    if (searchQuery && node.label.toLowerCase().includes(searchQuery.toLowerCase())) return '#ff4444';
                    return node.type === 'statute' ? '#d4af37' : '#4682B4';
                }}
                nodeOpacity={1}
                nodeResolution={16}

                linkColor={() => '#ffffff'}
                linkWidth={1}
                linkOpacity={0.3}

                d3VelocityDecay={0.2}
                warmupTicks={100}
                cooldownTicks={0}

                onNodeClick={handleNodeClick}
                onBackgroundClick={() => setSelectedNode(null)}
            />
        </div>
    );
};

export default LegalGraph;

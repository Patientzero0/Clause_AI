import React, { useEffect, useRef, useState } from 'react';
import { Worker, Viewer } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import { searchPlugin } from '@react-pdf-viewer/search';

// Import styles
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';
import '@react-pdf-viewer/search/lib/styles/index.css';

const PDFViewer = ({ fileUrl, searchTerms, chunkText }) => {
    // Ensure searchTerms is an array
    const safeSearchTerms = Array.isArray(searchTerms) ? searchTerms : [];
    const [isDocumentReady, setIsDocumentReady] = useState(false);
    const searchPluginInstance = searchPlugin();
    const defaultLayoutPluginInstance = defaultLayoutPlugin();

    const { highlight } = searchPluginInstance;

    // Extract meaningful search terms from chunk text or use provided terms
    const extractSearchTerms = () => {
        const terms = [];

        // Add provided search terms
        if (safeSearchTerms.length > 0) {
            terms.push(...safeSearchTerms);
        }

        // Extract key terms from chunk text (first 50 words)
        if (chunkText) {
            const words = chunkText.split(/\s+/).slice(0, 30).filter(word =>
                word.length > 3 &&
                !['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'who', 'way', 'use', 'her', 'she', 'him', 'his', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how'].includes(word.toLowerCase())
            );

            // Add unique meaningful words
            const uniqueWords = [...new Set(words)];
            terms.push(...uniqueWords.slice(0, 5));
        }

        return [...new Set(terms)].filter(term => term && term.trim().length > 0);
    };

    const performHighlight = () => {
        if (!isDocumentReady) return;

        const searchKeywords = extractSearchTerms();

        if (searchKeywords.length > 0) {
            console.log("Attempting to highlight terms:", searchKeywords);

            // Use a delay to ensure document is fully rendered
            setTimeout(() => {
                try {
                    const keywords = searchKeywords.map(term => ({
                        keyword: term.toString().trim(),
                        matchCase: false,
                    }));

                    highlight(keywords);
                } catch (error) {
                    console.error("Error highlighting terms:", error);
                }
            }, 500);
        }
    };

    // Highlight when document loads or search terms change
    useEffect(() => {
        if (isDocumentReady) {
            performHighlight();
        }
    }, [isDocumentReady, safeSearchTerms.join(','), chunkText]);

    const handleDocumentLoad = () => {
        setIsDocumentReady(true);
        // Additional delay to ensure rendering is complete
        setTimeout(() => {
            performHighlight();
        }, 1000);
    };

    return (
        <div style={{ height: '100%', width: '100%' }}>
            <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
                <Viewer
                    fileUrl={fileUrl}
                    plugins={[defaultLayoutPluginInstance, searchPluginInstance]}
                    onDocumentLoad={handleDocumentLoad}
                />
            </Worker>
        </div>
    );
};

export default PDFViewer;

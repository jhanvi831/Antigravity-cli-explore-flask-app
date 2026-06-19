document.addEventListener('DOMContentLoaded', () => {
    // State management
    let releaseNotes = [];
    let currentFilter = 'all';
    let searchQuery = '';
    let selectedUpdate = null;

    // DOM Elements
    const loader = document.getElementById('loader');
    const errorState = document.getElementById('error-state');
    const errorMessage = document.getElementById('error-message');
    const emptyState = document.getElementById('empty-state');
    const feedContainer = document.getElementById('feed-container');
    const searchInput = document.getElementById('search-input');
    const clearSearchBtn = document.getElementById('clear-search-btn');
    const refreshBtn = document.getElementById('refresh-btn');
    const refreshIcon = document.getElementById('refresh-icon');
    const retryBtn = document.getElementById('retry-btn');
    const clearFiltersBtn = document.getElementById('clear-filters-btn');
    const statusBar = document.getElementById('status-bar');
    const statusMessage = document.getElementById('status-message');
    const closeStatusBtn = document.getElementById('close-status-btn');
    
    // Stats elements
    const lastUpdatedTime = document.getElementById('last-updated-time');
    const totalDaysCount = document.getElementById('total-days-count');
    const countAll = document.getElementById('count-all');
    const countFeature = document.getElementById('count-feature');
    const countAnnouncement = document.getElementById('count-announcement');
    const countIssue = document.getElementById('count-issue');
    const countDeprecation = document.getElementById('count-deprecation');
    const countUpdate = document.getElementById('count-update');
    
    // Modal elements
    const tweetModal = document.getElementById('tweet-modal');
    const tweetTextarea = document.getElementById('tweet-textarea');
    const charCount = document.getElementById('char-count');
    const charWarning = document.getElementById('char-warning');
    const charCounterWrapper = document.querySelector('.char-counter-wrapper');
    const previewBadgeEl = document.getElementById('preview-badge-el');
    const previewTextEl = document.getElementById('preview-text-el');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const cancelTweetBtn = document.getElementById('cancel-tweet-btn');
    const copyTweetBtn = document.getElementById('copy-tweet-btn');
    const submitTweetBtn = document.getElementById('submit-tweet-btn');
    
    // Category filters
    const filterButtons = document.querySelectorAll('.filter-btn');

    // Category mapping for styling
    const categoryDetails = {
        'Feature': { icon: 'fa-star', class: 'feature', label: 'Feature' },
        'Announcement': { icon: 'fa-bullhorn', class: 'announcement', label: 'Announcement' },
        'Issue': { icon: 'fa-triangle-exclamation', class: 'issue', label: 'Issue / Bug' },
        'Deprecation': { icon: 'fa-ban', class: 'deprecation', label: 'Deprecation' },
        'Update': { icon: 'fa-pen-to-square', class: 'update', label: 'Update' }
    };

    // Initialize application
    fetchNotes(false);

    // Event Listeners
    refreshBtn.addEventListener('click', () => fetchNotes(true));
    retryBtn.addEventListener('click', () => fetchNotes(true));
    closeStatusBtn.addEventListener('click', hideStatus);
    
    // Search event listeners
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        clearSearchBtn.style.display = searchQuery ? 'flex' : 'none';
        renderFeed();
    });
    
    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        clearSearchBtn.style.display = 'none';
        searchInput.focus();
        renderFeed();
    });

    clearFiltersBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        clearSearchBtn.style.display = 'none';
        currentFilter = 'all';
        setActiveFilterButton('all');
        renderFeed();
    });

    // Category filter buttons
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            currentFilter = btn.dataset.filter;
            setActiveFilterButton(currentFilter);
            renderFeed();
        });
    });

    // Modal close listeners
    closeModalBtn.addEventListener('click', closeTweetModal);
    cancelTweetBtn.addEventListener('click', closeTweetModal);
    tweetModal.addEventListener('click', (e) => {
        if (e.target === tweetModal) closeTweetModal();
    });
    
    // Textarea input for character counter
    tweetTextarea.addEventListener('input', updateCharCount);

    // Tag suggestions click
    document.querySelectorAll('.tag-suggestion').forEach(tagEl => {
        tagEl.addEventListener('click', () => {
            const tag = tagEl.dataset.tag;
            const currentVal = tweetTextarea.value;
            // Append with space if needed
            if (currentVal.includes(tag)) return; // Don't duplicate
            
            tweetTextarea.value = currentVal.endsWith(' ') || currentVal === '' 
                ? currentVal + tag 
                : currentVal + ' ' + tag;
            updateCharCount();
        });
    });

    // Copy to clipboard
    copyTweetBtn.addEventListener('click', () => {
        const text = tweetTextarea.value;
        navigator.clipboard.writeText(text).then(() => {
            const originalHTML = copyTweetBtn.innerHTML;
            copyTweetBtn.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
            copyTweetBtn.disabled = true;
            setTimeout(() => {
                copyTweetBtn.innerHTML = originalHTML;
                copyTweetBtn.disabled = false;
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy: ', err);
            showStatus('Failed to copy text. Please select and copy manually.', 'error');
        });
    });

    // Submit Tweet (Open Twitter Web Intent)
    submitTweetBtn.addEventListener('click', () => {
        const tweetText = tweetTextarea.value;
        const encodedText = encodeURIComponent(tweetText);
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodedText}`;
        window.open(twitterUrl, '_blank', 'width=550,height=420');
        closeTweetModal();
    });

    // ESC key listener for modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && tweetModal.style.display !== 'none') {
            closeTweetModal();
        }
    });

    // Helper: Set active filter button styling
    function setActiveFilterButton(filter) {
        filterButtons.forEach(btn => {
            if (btn.dataset.filter === filter) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    // Fetch release notes API
    function fetchNotes(forceRefresh = false) {
        // UI states
        loader.style.display = 'flex';
        errorState.style.display = 'none';
        emptyState.style.display = 'none';
        feedContainer.style.display = 'none';
        
        if (forceRefresh) {
            refreshIcon.classList.add('spinning');
            refreshBtn.disabled = true;
        }

        const url = `/api/notes${forceRefresh ? '?refresh=true' : ''}`;

        fetch(url)
            .then(res => {
                if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                return res.json();
            })
            .then(res => {
                if (!res.success) throw new Error(res.error || 'Unknown API failure');
                
                releaseNotes = res.data;
                
                // Update timestamps and info
                lastUpdatedTime.textContent = res.last_fetched;
                totalDaysCount.textContent = releaseNotes.length;
                
                // Update stats and badge counts
                updateStats(releaseNotes);
                
                // Render feed items
                renderFeed();
                
                // Status notifications
                if (forceRefresh) {
                    if (res.warning) {
                        showStatus(res.warning, 'warning');
                    } else {
                        showStatus('Release notes feed updated successfully.', 'success');
                    }
                }
            })
            .catch(err => {
                console.error(err);
                errorMessage.textContent = err.message || 'Could not connect to the server.';
                errorState.style.display = 'flex';
                loader.style.display = 'none';
            })
            .finally(() => {
                if (forceRefresh) {
                    refreshIcon.classList.remove('spinning');
                    refreshBtn.disabled = false;
                }
            });
    }

    // Calculate update counts for stats panel
    function updateStats(notes) {
        let total = 0;
        let feature = 0;
        let announcement = 0;
        let issue = 0;
        let deprecation = 0;
        let update = 0;

        notes.forEach(day => {
            day.updates.forEach(u => {
                total++;
                const type = u.type;
                if (type === 'Feature') feature++;
                else if (type === 'Announcement') announcement++;
                else if (type === 'Issue') issue++;
                else if (type === 'Deprecation') deprecation++;
                else update++;
            });
        });

        countAll.textContent = total;
        countFeature.textContent = feature;
        countAnnouncement.textContent = announcement;
        countIssue.textContent = issue;
        countDeprecation.textContent = deprecation;
        countUpdate.textContent = update;
    }

    // Render feed on screen based on filters and search queries
    function renderFeed() {
        feedContainer.innerHTML = '';
        selectedUpdate = null;
        
        let filteredCount = 0;
        
        // Loop through days
        releaseNotes.forEach(day => {
            // Filter updates within the day
            const filteredUpdates = day.updates.filter(update => {
                const matchesCategory = currentFilter === 'all' || update.type === currentFilter;
                
                let matchesSearch = true;
                if (searchQuery) {
                    const inContent = update.text.toLowerCase().includes(searchQuery);
                    const inType = update.type.toLowerCase().includes(searchQuery);
                    const inDate = day.date.toLowerCase().includes(searchQuery);
                    matchesSearch = inContent || inType || inDate;
                }
                
                return matchesCategory && matchesSearch;
            });

            if (filteredUpdates.length > 0) {
                filteredCount += filteredUpdates.length;

                // Create date header group
                const dayGroup = document.createElement('div');
                dayGroup.className = 'day-group';

                const dayHeader = document.createElement('div');
                dayHeader.className = 'day-header';
                dayHeader.innerHTML = `
                    <div class="day-date">${day.date}</div>
                    <div class="day-line"></div>
                `;
                dayGroup.appendChild(dayHeader);

                const cardList = document.createElement('div');
                cardList.className = 'update-cards-list';

                // Append each card
                filteredUpdates.forEach(update => {
                    const card = createUpdateCard(update, day);
                    cardList.appendChild(card);
                });

                dayGroup.appendChild(cardList);
                feedContainer.appendChild(dayGroup);
            }
        });

        // Toggle visibility states
        loader.style.display = 'none';
        
        if (filteredCount === 0) {
            emptyState.style.display = 'flex';
            feedContainer.style.display = 'none';
        } else {
            emptyState.style.display = 'none';
            feedContainer.style.display = 'flex';
        }
    }

    // Highlight text matching search query safely without breaking HTML tags
    function highlightSearch(htmlText, query) {
        if (!query) return htmlText;
        // Simple safe text replacement for demo, we can build a regex that avoids tags
        // To be safe, we only replace matching words in the visible text parts, but for simplicity
        // we can just highlight plain text search on output. Let's do a basic case-insensitive replace of query
        // but avoid replacing HTML attributes.
        try {
            const escapedQuery = query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
            // This regex matches query outside of HTML tags (<...>)
            const regex = new RegExp(`(?<!<[^>]*)(${escapedQuery})`, 'gi');
            return htmlText.replace(regex, '<span class="highlight">$1</span>');
        } catch (e) {
            return htmlText; // Fallback to raw if regex fails
        }
    }

    // Create DOM card elements for updates
    function createUpdateCard(update, day) {
        const cat = categoryDetails[update.type] || categoryDetails['Update'];
        
        const card = document.createElement('div');
        card.className = `update-card card-${cat.class}`;
        card.dataset.id = `${day.id}-${update.type}-${Math.random().toString(36).substr(2, 4)}`;
        
        // Highlight search keyword if query is set
        const renderedHtml = highlightSearch(update.html, searchQuery);

        card.innerHTML = `
            <div class="card-header">
                <span class="card-badge badge-${cat.class}">
                    <i class="fa-solid ${cat.icon}"></i> ${cat.label}
                </span>
                <div class="card-actions">
                    <button class="btn-tweet-action" title="Prepare Tweet for this update">
                        <i class="fa-brands fa-x-twitter"></i> Tweet Update
                    </button>
                </div>
            </div>
            <div class="card-body">
                ${renderedHtml}
            </div>
        `;

        // Card selection highlights
        card.addEventListener('click', (e) => {
            // If they click on a link, don't trigger selection or modal
            if (e.target.tagName === 'A' || e.target.closest('a')) {
                return;
            }

            // If they clicked the Tweet button, open modal directly
            if (e.target.closest('.btn-tweet-action')) {
                e.stopPropagation();
                openTweetModal(update, day);
                return;
            }

            // Toggle selection
            const wasSelected = card.classList.contains('selected');
            document.querySelectorAll('.update-card').forEach(c => c.classList.remove('selected'));
            
            if (!wasSelected) {
                card.classList.add('selected');
                selectedUpdate = { update, day };
            } else {
                selectedUpdate = null;
            }
        });

        // Double click to open Tweet Modal directly
        card.addEventListener('dblclick', (e) => {
            if (e.target.tagName !== 'A' && !e.target.closest('a') && !e.target.closest('.btn-tweet-action')) {
                openTweetModal(update, day);
            }
        });

        return card;
    }

    // Tweet Modal actions
    function openTweetModal(update, day) {
        // Setup content
        const maxTextLen = 220; // safe padding for link & hashtags
        let tweetContentText = update.text;
        
        // Truncate text nicely
        if (tweetContentText.length > maxTextLen) {
            tweetContentText = tweetContentText.substring(0, maxTextLen - 3) + '...';
        }
        
        // Draft format: BigQuery [Type] (Date): "Text" -> Link
        const formattedTweet = `BigQuery ${update.type} (${day.date}): "${tweetContentText}"\n\nDetails: ${day.link} #BigQuery`;
        
        tweetTextarea.value = formattedTweet;
        
        // Modal visual info
        const cat = categoryDetails[update.type] || categoryDetails['Update'];
        previewBadgeEl.textContent = cat.label;
        previewBadgeEl.className = `preview-badge badge-${cat.class}`;
        previewTextEl.textContent = update.text;
        
        // Display Modal
        tweetModal.style.display = 'flex';
        tweetTextarea.focus();
        
        // Select textarea text initially to let them start editing immediately
        // tweetTextarea.setSelectionRange(0, tweetTextarea.value.length);
        
        updateCharCount();
    }

    function closeTweetModal() {
        tweetModal.style.display = 'none';
    }

    function updateCharCount() {
        const length = tweetTextarea.value.length;
        charCount.textContent = length;
        
        if (length > 280) {
            charCounterWrapper.classList.add('warn');
            charWarning.style.display = 'inline';
            submitTweetBtn.disabled = true;
            submitTweetBtn.style.opacity = '0.5';
            submitTweetBtn.style.cursor = 'not-allowed';
        } else {
            charCounterWrapper.classList.remove('warn');
            charWarning.style.display = 'none';
            submitTweetBtn.disabled = false;
            submitTweetBtn.style.opacity = '1';
            submitTweetBtn.style.cursor = 'pointer';
        }
    }

    // Status notifications
    function showStatus(message, type = 'info') {
        statusMessage.textContent = message;
        statusBar.className = `status-bar status-${type}`;
        
        if (type === 'success') {
            statusBar.style.backgroundColor = 'rgba(16, 185, 129, 0.15)';
            statusBar.style.borderColor = 'rgba(16, 185, 129, 0.3)';
            statusBar.style.color = '#a7f3d0';
        } else if (type === 'warning') {
            statusBar.style.backgroundColor = 'rgba(249, 115, 22, 0.15)';
            statusBar.style.borderColor = 'rgba(249, 115, 22, 0.3)';
            statusBar.style.color = '#ffedd5';
        } else if (type === 'error') {
            statusBar.style.backgroundColor = 'rgba(239, 68, 68, 0.15)';
            statusBar.style.borderColor = 'rgba(239, 68, 68, 0.3)';
            statusBar.style.color = '#fecaca';
        } else {
            statusBar.style.backgroundColor = 'rgba(59, 130, 246, 0.15)';
            statusBar.style.borderColor = 'rgba(59, 130, 246, 0.3)';
            statusBar.style.color = '#bfdbfe';
        }
        
        statusBar.style.display = 'flex';
        
        // Auto hide after 6 seconds for success/info
        if (type !== 'error') {
            setTimeout(hideStatus, 6000);
        }
    }

    function hideStatus() {
        statusBar.style.display = 'none';
    }
});

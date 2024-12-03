document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('form');
    const titleInput = document.getElementById('title');
    const messageInput = document.getElementById('message');
    const contentDiv = document.getElementById('content');


    fetch('config.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load config.json');
            }
            return response.json(); // Parse the JSON data
        })
        .then(config => {

            console.log('Config loaded:', config);

            // Now the config object is available to use
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const title = titleInput.value.trim();
                const message = messageInput.value.trim();

                if (!title || !message) {
                    alert('Title and message are required');
                    return;
                }

                const postData = {
                    title,
                    message,
                }
                try {
                    const response = await fetch(config.serviceApiUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(postData),
                    });
                    console.log('Response:', response);
                    const data = await response.json();

                    if (response.ok) {
                        alert(`Post with ID ${data.postId} made successfully! `);
                        form.reset();
                        fetchPosts();
                    } else {
                        alert(`Error: ${data.message}`);
                    }
                } catch (error) {
                    console.error(`Error submitting post: ${error}`);
                    alert(`Error submitting post: ${error}`);
                }
            });

            const fetchPosts = async () => {
                try {
                    const response = await fetch(config.serviceApiUrl, {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    });
                    const data = await response.json();

                    if (data.posts) {
                        displayPosts(data.posts);
                    } else {
                        alert('No posts available or failed to retrieve posts.');
                    }
                } catch (error) {
                    console.error('Error fetching posts:', error);
                    alert('Failed to fetch posts.');
                }
            };

            // Function to display posts in the UI
            const displayPosts = (posts) => {
                contentDiv.innerHTML = ''; // Clear existing content

                if (posts.length === 0) {
                    contentDiv.innerHTML = '<p>No posts available.</p>';
                    return;
                }

                const list = document.createElement('ol');

                posts.forEach((post) => {
                    const item = document.createElement('li');
                    const title = document.createElement('h3');
                    title.textContent = post.title;
                    const messagePg = document.createElement('p');
                    messagePg.textContent = post.message;
                    const timestampSmall = document.createElement('small');
                    timestampSmall.textContent = new Date(post.timestamp).toLocaleString();

                    item.appendChild(title);
                    item.appendChild(messagePg);
                    item.appendChild(timestampSmall);
                    list.appendChild(item);
                });

                contentDiv.appendChild(list);
            };
            fetchPosts(); // fetch posts when page is loaded
        })
        .catch(error => {
            console.error('Error loading config:', error);
        });
});

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
                        setTimeout(fetchPosts, 2000);
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
                    console.log('Response:', response);
                    const data = await response.json();
                    let responseBody;
                    if(data.body) {
                        responseBody = JSON.parse(data.body);
                    } else {
                        responseBody = data;
                    }
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
                console.log('Posts:', posts);
                posts.forEach((post) => {
                const div = document.createElement('div');
                div.classList.add('messages');
            
                const title = document.createElement('div');
                title.textContent = post.title;
                // title.textContent = document.querySelector(post.title).value;
                title.classList.add('messageTitle');
            
                const body = document.createElement('div');
                body.textContent = post.message
                body.classList.add('messageBody');
            
                const timestampSmall = document.createElement('small');
                timestampSmall.textContent = new Date(post.timestamp).toLocaleString();
                timestampSmall.classList.add('messageBody');
                
                div.appendChild(title);
                div.appendChild(body);
                div.appendChild(timestampSmall);
                contentDiv.prepend(div);
                });
            };
            fetchPosts(); // fetch posts when page is loaded
        })
        .catch(error => {
            console.error('Error loading config:', error);
        });
});

